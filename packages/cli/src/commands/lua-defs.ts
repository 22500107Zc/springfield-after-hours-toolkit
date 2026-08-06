import fs from 'node:fs';
import path from 'node:path';
import { EXIT_CODES, type ExitCode } from '@sah/core';
import {
  GAME_DEFINITIONS_DIRECTORY,
  LUA_RUNTIME_VERSION,
  OFFICIAL_DEFINITIONS_DIRECTORY,
  applyInstall,
  checkDefinitions,
  defaultArtifactPath,
  downloadFile,
  generateDefinitions,
  planInstall,
} from '@sah/game-lua-definitions';
import { createContext } from '../context.js';
import { printError, printJson, printLine, renderTable } from '../output.js';

/**
 * `sah lua-defs` — Lua Language Server definitions for the Game.* commands.
 *
 * This exists because Donut Team's published definitions cover the Custom Files
 * API but not the `Game` table, which Game.lua builds at runtime and which no
 * editor can therefore discover on its own.
 */

export interface GenerateOptions {
  output?: string;
  check: boolean;
  json: boolean;
}

export function runLuaDefsGenerate(options: GenerateOptions): ExitCode {
  const context = createContext();
  const result = generateDefinitions({
    registries: context.registries,
    toolkitVersion: context.version,
  });

  const outputPath = options.output ? path.resolve(options.output) : defaultArtifactPath();

  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : undefined;
  const unchanged = existing === result.contents;

  if (options.check) {
    if (unchanged) {
      if (options.json) {
        printJson({ ok: true, command: 'lua-defs generate --check', outputPath, unchanged: true });
      } else {
        printLine(`Up to date: ${outputPath}`);
      }
      return EXIT_CODES.OK;
    }
    const message = `${outputPath} is out of date. Run "sah lua-defs generate".`;
    if (options.json) {
      printJson({ ok: false, command: 'lua-defs generate --check', outputPath, unchanged: false });
    } else {
      printError(message);
    }
    return EXIT_CODES.VALIDATION_FAILED;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.contents, 'utf8');

  const commandCount = result.commandNames.length;
  const inverseCount = result.definitions.length - commandCount;

  if (options.json) {
    printJson({
      ok: true,
      command: 'lua-defs generate',
      outputPath,
      unchanged,
      commands: commandCount,
      inverses: inverseCount,
      totalFunctions: result.definitions.length + 2,
      sha256: result.sha256,
      upstream: result.upstream,
    });
    return EXIT_CODES.OK;
  }

  printLine(`${unchanged ? 'Regenerated (no change)' : 'Wrote'} ${outputPath}`);
  printLine();
  renderTable([
    ['commands', String(commandCount)],
    ['Not_ inverses', String(inverseCount)],
    ['plus', 'Game.EndIf(), Game.Not()'],
    ['sha256', result.sha256],
    ['from', `${result.upstream.repository} @ ${result.upstream.commit.slice(0, 12)}`],
  ]);
  return EXIT_CODES.OK;
}

export function runLuaDefsCheck(options: { file?: string; json: boolean }): ExitCode {
  const context = createContext();
  const result = checkDefinitions({
    registries: context.registries,
    toolkitVersion: context.version,
    ...(options.file ? { artifactPath: path.resolve(options.file) } : {}),
  });

  if (options.json) {
    printJson({
      ok: result.ok,
      command: 'lua-defs check',
      artifactPath: result.artifactPath,
      registryCommands: result.registryCommandCount,
      definitions: result.definitionCount,
      expectedSha256: result.expectedSha256,
      actualSha256: result.actualSha256 ?? null,
      problems: result.problems,
    });
    return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  }

  printLine(`Checking ${result.artifactPath}`);
  printLine();
  renderTable([
    ['registry commands', String(result.registryCommandCount)],
    ['generated functions', String(result.definitionCount)],
    ['expected sha256', result.expectedSha256],
    ['actual sha256', result.actualSha256 ?? '(file missing)'],
  ]);
  printLine();

  if (result.problems.length === 0) {
    printLine('Every verified command has a definition, nothing was invented,');
    printLine('arity and scope match the registry, and the artifact is current.');
    return EXIT_CODES.OK;
  }

  for (const problem of result.problems) {
    printError(`${problem.severity} [${problem.kind}] ${problem.message}`);
    if (problem.hint) printError(`  hint: ${problem.hint}`);
  }
  return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
}

export interface InstallCommandOptions {
  projectRoot: string;
  withOfficial: boolean;
  apply: boolean;
  json: boolean;
}

export async function runLuaDefsInstall(options: InstallCommandOptions): Promise<ExitCode> {
  const context = createContext();
  const generated = generateDefinitions({
    registries: context.registries,
    toolkitVersion: context.version,
  });

  // Prefer an already-fetched copy so an install can work offline.
  const vendored = findVendoredOfficialDefinitions();

  const plan = await planInstall({
    projectRoot: options.projectRoot,
    definitions: generated.contents,
    withOfficial: options.withOfficial,
    officialSourceDirectory: vendored,
    download: options.withOfficial ? downloadFile : undefined,
  });

  if (plan.errors.length > 0) {
    if (options.json) {
      printJson({ ok: false, command: 'lua-defs install', errors: plan.errors, plan: plan.files });
    } else {
      for (const error of plan.errors) printError(error);
      printError('');
      printError('Nothing was written.');
    }
    return EXIT_CODES.VALIDATION_FAILED;
  }

  if (!options.apply) {
    if (options.json) {
      printJson({
        ok: true,
        command: 'lua-defs install',
        applied: false,
        projectRoot: plan.projectRoot,
        upToDate: plan.upToDate,
        warnings: plan.warnings,
        plan: plan.files.map((file) => ({
          path: file.path,
          action: file.action,
          note: file.note ?? null,
          bytes: Buffer.byteLength(file.contents, 'utf8'),
        })),
      });
      return EXIT_CODES.OK;
    }

    printLine(`Planned changes for ${plan.projectRoot}`);
    printLine('(nothing has been written — re-run with --apply)');
    printLine();
    renderTable(
      plan.files.map(
        (file) => [`${file.action.padEnd(9)} ${file.path}`, file.note ?? ''] as [string, string],
      ),
    );
    for (const warning of plan.warnings) {
      printLine();
      printLine(`note: ${warning}`);
    }
    return EXIT_CODES.OK;
  }

  const applied = applyInstall(plan);

  if (options.json) {
    printJson({
      ok: true,
      command: 'lua-defs install',
      applied: true,
      projectRoot: plan.projectRoot,
      written: applied.written,
      unchanged: applied.skipped,
      warnings: plan.warnings,
    });
    return EXIT_CODES.OK;
  }

  printLine(`Installed into ${plan.projectRoot}`);
  printLine();
  for (const file of applied.written) printLine(`  wrote      ${file}`);
  for (const file of applied.skipped) printLine(`  unchanged  ${file}`);
  for (const warning of plan.warnings) {
    printLine();
    printLine(`note: ${warning}`);
  }
  printLine();
  printLine('Open the project in VS Code with the Lua extension (sumneko.lua) installed.');
  printLine(`Lua runtime is set to ${LUA_RUNTIME_VERSION}; libraries:`);
  printLine(`  ${GAME_DEFINITIONS_DIRECTORY}`);
  if (options.withOfficial) printLine(`  ${OFFICIAL_DEFINITIONS_DIRECTORY}`);
  return EXIT_CODES.OK;
}

/** Locates this repository's fetched copy of the official definitions, if any. */
function findVendoredOfficialDefinitions(): string | undefined {
  let current = path.dirname(defaultArtifactPath());
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(current, 'vendor', 'donutteam', 'lucas-mod-launcher-lua');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}
