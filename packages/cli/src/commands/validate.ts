import { EXIT_CODES, type ExitCode } from '@sah/core';
import { loadProject, projectLoaded, validateProject } from '@sah/validator';
import { createContext } from '../context.js';
import { printJson, printLine, renderDiagnostics, renderSummary } from '../output.js';

/**
 * `sah validate` — the command that decides whether a campaign is buildable.
 *
 * Exit codes:
 *   0  valid (warnings are allowed)
 *   1  validation errors
 *   3  no campaign found at the given path
 */
export function runValidate(options: { target: string; json: boolean }): ExitCode {
  const context = createContext({ campaignRoot: options.target });
  const project = loadProject(options.target);

  if (!projectLoaded(project)) {
    if (options.json) {
      printJson({
        ok: false,
        command: 'validate',
        target: options.target,
        diagnostics: project.diagnostics,
        summary: { errors: project.diagnostics.length, warnings: 0, infos: 0 },
      });
    } else {
      renderDiagnostics(project.diagnostics);
    }
    // A campaign file that exists but is invalid is a validation failure, not a
    // missing input — the distinction matters to scripts reading the exit code.
    return project.campaignFile === '' ? EXIT_CODES.NOT_FOUND : EXIT_CODES.VALIDATION_FAILED;
  }

  const result = validateProject(project, context.registries);

  if (options.json) {
    printJson({
      ok: result.ok,
      command: 'validate',
      target: options.target,
      campaign: {
        id: project.campaign.id,
        title: project.campaign.title,
        declaredStatus: project.campaign.status,
      },
      counts: {
        missions: project.missions.length,
        conversations: project.conversations.length,
        presets: project.presets.length,
      },
      diagnostics: result.diagnostics,
      acceptedRisks: result.acceptedRisks,
      summary: result.summary,
    });
    return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  }

  printLine(`Validating ${project.campaign.title} (${project.campaign.id})`);
  printLine(
    `  ${project.missions.length} mission(s), ${project.conversations.length} conversation(s), ${project.presets.length} preset(s)`,
  );
  printLine();

  if (result.diagnostics.length === 0) {
    printLine('No problems found.');
  } else {
    renderDiagnostics(result.diagnostics);
    printLine();
    renderSummary(result.summary);
  }

  if (result.acceptedRisks.length > 0) {
    printLine();
    printLine('Accepted risks (recorded in the build manifest):');
    for (const risk of result.acceptedRisks) {
      printLine(`  ${risk.registry}:${risk.reference} [${risk.status}] — ${risk.reason}`);
    }
  }

  if (!result.ok) {
    printLine();
    printLine('This campaign will not build until the errors above are resolved.');
    printLine('Run "sah explain <code>" for detail on a specific diagnostic.');
  }

  return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
}
