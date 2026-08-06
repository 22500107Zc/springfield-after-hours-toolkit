import { Command } from 'commander';
import { EXIT_CODES, SahError, type ExitCode } from '@sah/core';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runValidate } from './commands/validate.js';
import { runBuild } from './commands/build.js';
import { runRegistryList, runRegistrySearch, runRegistryValidate } from './commands/registry.js';
import { runScaffold } from './commands/scaffold.js';
import { runConfig, runExplain, runPackage } from './commands/misc.js';
import { runAiCommand } from './commands/ai.js';
import { runMcpStart } from './commands/mcp.js';
import { runLuaDefsCheck, runLuaDefsGenerate, runLuaDefsInstall } from './commands/lua-defs.js';
import {
  runPocketCaseCheck,
  runPocketCleanExport,
  runPocketConflicts,
  runPocketDiff,
  runPocketManifest,
  runPocketPath,
} from './commands/pocket.js';
import { toolkitVersion } from './context.js';
import { printError } from './output.js';

/**
 * Builds the `sah` command tree.
 *
 * Every action returns an exit code rather than calling process.exit, so the
 * whole CLI is testable in-process.
 */
export function createProgram(): Command {
  const program = new Command();
  let exitCode: ExitCode = EXIT_CODES.OK;
  const setExit = (code: ExitCode): void => {
    // The worst outcome across a run wins.
    if (code !== EXIT_CODES.OK) exitCode = code;
  };

  program
    .name('sah')
    .description(
      [
        'Springfield After Hours Toolkit — author story-driven campaigns for',
        "The Simpsons: Hit & Run under Lucas' Simpsons: Hit & Run Mod Launcher.",
        '',
        'This is an unofficial fan-made tool. It is not affiliated with Electronic',
        'Arts, Disney, Fox, Radical Entertainment or Donut Team, and it does not',
        'contain or distribute the game or any of its assets.',
      ].join('\n'),
    )
    .version(toolkitVersion(), '-v, --version')
    .showHelpAfterError('(run "sah --help" for usage)')
    .enablePositionalOptions();

  program
    .command('doctor')
    .description('Report the environment: tools, paths, registries, and platform limits')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runDoctor({ json: options.json }));
    });

  program
    .command('init')
    .description('Create a new campaign workspace')
    .argument('[directory]', 'directory to create the workspace in', '.')
    .option('--id <id>', 'campaign id (lower-kebab-case)', 'my-campaign')
    .option('--title <title>', 'campaign title', 'My Campaign')
    .option('--force', 'overwrite existing files', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        directory: string,
        options: { id: string; title: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runInit({
            directory,
            id: options.id,
            title: options.title,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  program
    .command('validate')
    .description('Validate a campaign against the schemas and the verified registries')
    .argument('[target]', 'campaign directory or campaign file', '.')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { json: boolean }) => {
      setExit(runValidate({ target, json: options.json }));
    });

  program
    .command('build')
    .description('Validate, then generate the mod into the build directory')
    .argument('[target]', 'campaign directory or campaign file', '.')
    .option('-o, --output <directory>', 'output directory (defaults to <campaign>/build)')
    .option('--dry-run', 'report what would be written without writing it', false)
    .option(
      '--include-timestamp',
      'record a build time in the manifest (breaks byte-identical rebuilds)',
      false,
    )
    .option('--json', 'machine-readable output', false)
    .action(
      (
        target: string,
        options: {
          output?: string;
          dryRun: boolean;
          json: boolean;
          includeTimestamp: boolean;
        },
      ) => {
        setExit(
          runBuild({
            target,
            ...(options.output ? { outputDirectory: options.output } : {}),
            dryRun: options.dryRun,
            json: options.json,
            includeTimestamp: options.includeTimestamp,
          }),
        );
      },
    );

  program
    .command('package')
    .description('Package a built mod into a distributable archive')
    .argument('[target]', 'campaign directory', '.')
    .option('-o, --output <file>', 'output archive path')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { output?: string; json: boolean }) => {
      setExit(
        runPackage({
          target,
          ...(options.output ? { outputFile: options.output } : {}),
          json: options.json,
        }),
      );
    });

  program
    .command('config')
    .description('Show the effective configuration and where each value came from')
    .argument('[target]', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { json: boolean }) => {
      setExit(runConfig({ target, json: options.json }));
    });

  program
    .command('explain')
    .description('Explain a diagnostic code')
    .argument('<code>', 'diagnostic code, e.g. SAH2001')
    .option('--json', 'machine-readable output', false)
    .action((code: string, options: { json: boolean }) => {
      setExit(runExplain({ code, json: options.json }));
    });

  // --- campaign / mission / dialogue scaffolding ------------------------------
  const campaign = program.command('campaign').description('Campaign-level commands');
  campaign
    .command('new')
    .description('Create a new campaign workspace (alias of "sah init")')
    .argument('[directory]', 'directory to create the workspace in', '.')
    .option('--id <id>', 'campaign id (lower-kebab-case)', 'my-campaign')
    .option('--title <title>', 'campaign title', 'My Campaign')
    .option('--force', 'overwrite existing files', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        directory: string,
        options: { id: string; title: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runInit({
            directory,
            id: options.id,
            title: options.title,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  const mission = program.command('mission').description('Mission-level commands');
  mission
    .command('new')
    .description('Scaffold a new mission file')
    .argument('<id>', 'mission id (lower-kebab-case)')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--title <title>', 'mission title')
    .option('--force', 'overwrite an existing file', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        id: string,
        options: { campaign: string; title?: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runScaffold({
            kind: 'mission',
            id,
            ...(options.title ? { title: options.title } : {}),
            campaignRoot: options.campaign,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  const dialogue = program.command('dialogue').description('Dialogue-level commands');
  dialogue
    .command('new')
    .description('Scaffold a new conversation file')
    .argument('<id>', 'conversation id (lower-kebab-case)')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--title <title>', 'conversation title')
    .option('--force', 'overwrite an existing file', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        id: string,
        options: { campaign: string; title?: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runScaffold({
            kind: 'dialogue',
            id,
            ...(options.title ? { title: options.title } : {}),
            campaignRoot: options.campaign,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  // --- registry ---------------------------------------------------------------
  const registry = program
    .command('registry')
    .description('Inspect the verified game-content registries');

  registry
    .command('validate')
    .description('Check every registry record for schema validity and provenance')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runRegistryValidate({ json: options.json }));
    });

  registry
    .command('search')
    .description('Search the registries')
    .argument('[kind]', 'registry to search, e.g. location, character, command')
    .argument('[query...]', 'search terms')
    .option('--status <statuses>', 'comma-separated verification statuses to include')
    .option('--limit <n>', 'maximum results', '20')
    .option('--json', 'machine-readable output', false)
    .action(
      (
        kind: string | undefined,
        query: string[] | undefined,
        options: { status?: string; limit: string; json: boolean },
      ) => {
        const terms = query ?? [];
        // "sah registry search bart" — no kind given, treat the first word as the query.
        const kindKnown = kind !== undefined && terms.length > 0;
        const searchQuery = kindKnown
          ? terms.join(' ')
          : [kind, ...terms].filter(Boolean).join(' ');

        if (searchQuery.trim().length === 0) {
          printError('A search query is required. Example: sah registry search character bart');
          setExit(EXIT_CODES.USAGE);
          return;
        }

        setExit(
          runRegistrySearch({
            ...(kindKnown && kind ? { kind } : {}),
            query: searchQuery,
            ...(options.status ? { status: options.status } : {}),
            limit: Number.parseInt(options.limit, 10) || 20,
            json: options.json,
          }),
        );
      },
    );

  registry
    .command('list')
    .description('List every record in one registry')
    .argument('<kind>', 'registry to list')
    .option('--json', 'machine-readable output', false)
    .action((kind: string, options: { json: boolean }) => {
      setExit(runRegistryList({ kind, json: options.json }));
    });

  // --- ai ---------------------------------------------------------------------
  const ai = program
    .command('ai')
    .description(
      'Optional Anthropic API assistance (requires ANTHROPIC_API_KEY; may incur charges)',
    );

  ai.command('doctor')
    .description('Report whether the optional AI integration is usable')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runAiCommand({ subcommand: 'doctor', json: options.json }));
    });

  ai.command('plan')
    .description('Ask Claude to propose campaign structure (never writes files directly)')
    .argument('<prompt...>', 'what you want planned')
    .option('-C, --campaign <directory>', 'campaign directory for context', '.')
    .option('--json', 'machine-readable output', false)
    .action((prompt: string[], options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'plan',
          prompt: prompt.join(' '),
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('scaffold-mission')
    .description('Ask Claude to propose a mission, then validate it before anything is written')
    .argument('<prompt...>', 'what the mission should do')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((prompt: string[], options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'scaffold-mission',
          prompt: prompt.join(' '),
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('explain-error')
    .description('Ask Claude to explain a validation diagnostic in context')
    .argument('<code>', 'diagnostic code')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((code: string, options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'explain-error',
          prompt: code,
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('audit')
    .description('Ask Claude to review a campaign for structural and narrative problems')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'audit',
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  // --- lua-defs ---------------------------------------------------------------
  const luaDefs = program
    .command('lua-defs')
    .description('Lua Language Server definitions for the Game.* mission commands');

  luaDefs
    .command('generate')
    .description('Generate Game.meta.lua from the verified command registry')
    .option('-o, --output <file>', 'output path (defaults to the packaged artifact)')
    .option('--check', 'fail if the artifact is out of date instead of writing it', false)
    .option('--json', 'machine-readable output', false)
    .action((options: { output?: string; check: boolean; json: boolean }) => {
      setExit(
        runLuaDefsGenerate({
          ...(options.output ? { output: options.output } : {}),
          check: options.check,
          json: options.json,
        }),
      );
    });

  luaDefs
    .command('check')
    .description('Verify the definitions against the registry and the pinned upstream commit')
    .option('-f, --file <file>', 'definitions file to check')
    .option('--json', 'machine-readable output', false)
    .action((options: { file?: string; json: boolean }) => {
      setExit(
        runLuaDefsCheck({
          ...(options.file ? { file: options.file } : {}),
          json: options.json,
        }),
      );
    });

  luaDefs
    .command('install')
    .description('Set up a mod project to use these definitions in an editor')
    .argument('<mod-project>', 'path to the mod project to configure')
    .option('--with-official', "also install Donut Team's official Custom Files definitions", false)
    .option('--apply', 'write the changes (without this, the plan is only shown)', false)
    .option('--json', 'machine-readable output', false)
    .action(
      async (
        modProject: string,
        options: { withOfficial: boolean; apply: boolean; json: boolean },
      ) => {
        setExit(
          await runLuaDefsInstall({
            projectRoot: modProject,
            withOfficial: options.withOfficial,
            apply: options.apply,
            json: options.json,
          }),
        );
      },
    );

  // --- pocket -----------------------------------------------------------------
  // Six small filesystem utilities. They know nothing about the game, so they
  // work on any mod folder — including one this toolkit did not build.
  const pocket = program
    .command('pocket')
    .description('SHAR Pocket Tools — clean, compare and prepare mod folders');

  pocket
    .command('case-check')
    .alias('case')
    .description('Find paths that differ only by case, and references whose casing is wrong')
    .argument('<directory>', 'mod folder to check')
    .option('--no-references', 'only check filenames; do not read text files')
    .option('--json', 'machine-readable output', false)
    .action((directory: string, options: { references: boolean; json: boolean }) => {
      setExit(
        runPocketCaseCheck({
          directory,
          references: options.references,
          json: options.json,
        }),
      );
    });

  pocket
    .command('clean-export')
    .alias('clean')
    .description('Copy a mod folder without .DS_Store, AppleDouble, __MACOSX and other junk')
    .argument('<source>', 'mod folder to clean')
    .argument('[destination]', 'where to write the clean copy (omit to preview only)')
    .option('--in-place', 'delete junk from the original folder instead of copying', false)
    .option('--yes', 'confirm an --in-place deletion', false)
    .option('--force', 'allow writing into a destination that is not empty', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        source: string,
        destination: string | undefined,
        options: { inPlace: boolean; yes: boolean; force: boolean; json: boolean },
      ) => {
        setExit(
          runPocketCleanExport({
            source,
            ...(destination ? { destination } : {}),
            inPlace: options.inPlace,
            yes: options.yes,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  pocket
    .command('conflicts')
    .description('Report paths supplied by more than one mod')
    .argument('<directories...>', 'two or more mod folders')
    .option('--json', 'machine-readable output', false)
    .action((directories: string[], options: { json: boolean }) => {
      setExit(runPocketConflicts({ directories, json: options.json }));
    });

  pocket
    .command('manifest')
    .description('Record every file, its size and its SHA-256, deterministically')
    .argument('<directory>', 'mod folder to record')
    .option('-o, --output <file>', 'write to a file instead of standard output')
    .option('--format <format>', 'json or text', 'json')
    .option('--json', 'machine-readable status output (implied without --output)', false)
    .action((directory: string, options: { output?: string; format: string; json: boolean }) => {
      if (options.format !== 'json' && options.format !== 'text') {
        printError(`Unknown format "${options.format}". Use json or text.`);
        setExit(EXIT_CODES.USAGE);
        return;
      }
      setExit(
        runPocketManifest({
          directory,
          ...(options.output ? { output: options.output } : {}),
          format: options.format,
          json: options.json,
        }),
      );
    });

  pocket
    .command('diff')
    .description('Compare two mod releases or two manifests')
    .argument('<old>', 'the earlier folder or manifest')
    .argument('<new>', 'the later folder or manifest')
    .option('--show-unchanged', 'list unchanged files as well as counting them', false)
    .option('--json', 'machine-readable output', false)
    .action((before: string, after: string, options: { showUnchanged: boolean; json: boolean }) => {
      setExit(
        runPocketDiff({
          before,
          after,
          showUnchanged: options.showUnchanged,
          json: options.json,
        }),
      );
    });

  pocket
    .command('path')
    .description('Convert a file inside a mod project to the path forms mods are written with')
    .argument('<project>', 'the mod project folder')
    .argument('<file>', 'a file inside it')
    .option('--form <form>', 'print one form only: windows, posix, ini or lua')
    .option('--copy', 'also copy it to the clipboard', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (project: string, file: string, options: { form?: string; copy: boolean; json: boolean }) => {
        setExit(
          runPocketPath({
            project,
            file,
            ...(options.form ? { form: options.form } : {}),
            copy: options.copy,
            json: options.json,
          }),
        );
      },
    );

  // --- mcp --------------------------------------------------------------------
  const mcp = program.command('mcp').description('Local MCP server for Claude Code');
  mcp
    .command('start')
    .description('Start the MCP server on stdio')
    .option(
      '--workspace <directory>',
      'restrict all file access to this directory (defaults to the current directory)',
    )
    .action(async (options: { workspace?: string }) => {
      setExit(await runMcpStart(options.workspace ? { workspace: options.workspace } : {}));
    });

  // Expose the accumulated exit code to the caller.
  Object.defineProperty(program, 'sahExitCode', {
    get: () => exitCode,
    configurable: true,
  });

  // Commander calls process.exit directly for --help, --version and usage
  // errors. Overriding that on every command makes the whole CLI runnable
  // in-process, which is what lets the exit codes be tested rather than assumed.
  applyExitOverride(program);

  return program;
}

function applyExitOverride(command: Command): void {
  command.exitOverride();
  for (const child of command.commands) applyExitOverride(child);
}

export async function runCli(argv: readonly string[]): Promise<ExitCode> {
  const program = createProgram();
  try {
    await program.parseAsync([...argv], { from: 'user' });
  } catch (error) {
    if (error instanceof SahError) {
      printError(error.message);
      if (error.hint) printError(`hint: ${error.hint}`);
      return error.exitCode;
    }
    // With exitOverride in place, Commander throws instead of exiting. Help and
    // version are successful outcomes; everything else commander- prefixed is a
    // usage error.
    const commanderError = error as { code?: string; exitCode?: number };
    if (
      commanderError.code === 'commander.helpDisplayed' ||
      commanderError.code === 'commander.help' ||
      commanderError.code === 'commander.version'
    ) {
      return EXIT_CODES.OK;
    }
    if (commanderError.code?.startsWith('commander.')) {
      return EXIT_CODES.USAGE;
    }
    printError(`Unexpected error: ${(error as Error).message}`);
    return EXIT_CODES.INTERNAL;
  }

  return (program as Command & { sahExitCode: ExitCode }).sahExitCode;
}
