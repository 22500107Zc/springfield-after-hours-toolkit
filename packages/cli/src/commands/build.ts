import path from 'node:path';
import { EXIT_CODES, type ExitCode } from '@sah/core';
import { buildCampaign } from '@sah/compiler';
import { loadProject, projectLoaded } from '@sah/validator';
import { createContext } from '../context.js';
import { printJson, printLine, renderDiagnostics, renderSummary } from '../output.js';

export interface BuildCommandOptions {
  target: string;
  outputDirectory?: string;
  dryRun: boolean;
  json: boolean;
  includeTimestamp: boolean;
}

export function runBuild(options: BuildCommandOptions): ExitCode {
  const context = createContext({ campaignRoot: options.target });
  const project = loadProject(options.target);

  if (!projectLoaded(project)) {
    if (options.json) {
      printJson({ ok: false, command: 'build', diagnostics: project.diagnostics });
    } else {
      renderDiagnostics(project.diagnostics);
    }
    return project.campaignFile === '' ? EXIT_CODES.NOT_FOUND : EXIT_CODES.VALIDATION_FAILED;
  }

  const outputDirectory = path.resolve(
    options.outputDirectory ?? path.join(project.root, context.config.buildDirectory),
  );

  const result = buildCampaign(project, context.registries, {
    outputDirectory,
    dryRun: options.dryRun,
    toolkitVersion: context.version,
    includeTimestamp: options.includeTimestamp,
  });

  if (options.json) {
    printJson({
      ok: result.ok,
      command: 'build',
      dryRun: result.dryRun,
      outputDirectory,
      files: result.files.map((file) => ({ path: file.path, generatedFrom: file.generatedFrom })),
      assets: result.copiedAssets.map((a) => a.to),
      manifest: result.manifest,
      diagnostics: result.diagnostics,
      summary: result.validation.summary,
    });
    return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  }

  if (!result.ok) {
    printLine(`Build refused for ${project.campaign.title}.`);
    printLine();
    renderDiagnostics(result.diagnostics);
    printLine();
    renderSummary(result.validation.summary);
    printLine();
    printLine('Nothing was written. Fix the errors above and build again.');
    return EXIT_CODES.VALIDATION_FAILED;
  }

  const warnings = result.diagnostics.filter((d) => d.severity !== 'error');
  if (warnings.length > 0) {
    renderDiagnostics(warnings);
    printLine();
  }

  printLine(
    options.dryRun
      ? `Dry run — ${result.files.length} file(s) would be written to ${outputDirectory}`
      : `Built ${project.campaign.title} into ${outputDirectory}`,
  );
  printLine();
  for (const file of [...result.files].sort((a, b) => a.path.localeCompare(b.path))) {
    printLine(`  ${file.path}`);
  }
  if (result.copiedAssets.length > 0) {
    printLine();
    printLine(`  ${result.copiedAssets.length} asset file(s) copied from the campaign.`);
  }

  if (result.manifest && result.manifest.acceptedRisks.length > 0) {
    printLine();
    printLine('This build includes references you explicitly accepted despite weak verification:');
    for (const risk of result.manifest.acceptedRisks) {
      printLine(`  ${risk.registry}:${risk.reference} [${risk.status}] — ${risk.reason}`);
    }
  }

  if (result.manifest && !result.manifest.upstream.gameLua.installed) {
    printLine();
    printLine(
      'NOTE: Game.lua is not installed, so this mod will not run yet. Run "npm run upstream:fetch".',
    );
  }

  return EXIT_CODES.OK;
}
