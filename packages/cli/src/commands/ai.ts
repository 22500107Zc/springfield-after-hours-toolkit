import { EXIT_CODES, type ExitCode } from '@sah/core';
import { checkAiAvailability, estimateWorstCaseCostUsd } from '@sah/ai';
import { createContext } from '../context.js';
import { printError, printJson, printLine, renderTable } from '../output.js';

/**
 * `sah ai ...` — the optional Anthropic integration.
 *
 * Everything here is gated on ANTHROPIC_API_KEY, and every command warns about
 * charges before doing anything. Commands that would call the API are currently
 * wired only as far as their guardrails: they report exactly what is and is not
 * implemented rather than pretending to work.
 */

export interface AiCommandOptions {
  subcommand: 'doctor' | 'plan' | 'scaffold-mission' | 'explain-error' | 'audit';
  prompt?: string;
  campaignRoot?: string;
  json: boolean;
}

export function runAiCommand(options: AiCommandOptions): ExitCode {
  const context = createContext(options.campaignRoot ? { campaignRoot: options.campaignRoot } : {});
  const availability = checkAiAvailability();

  if (options.subcommand === 'doctor') {
    const worstCase = estimateWorstCaseCostUsd(
      {
        maxOutputTokens: context.config.aiMaxOutputTokens,
        maxCostUsd: context.config.aiMaxCostUsd,
        model: context.config.anthropicModel,
      },
      4000,
    );

    if (options.json) {
      printJson({
        ok: availability.available,
        command: 'ai doctor',
        apiKeyPresent: availability.hasApiKey,
        reason: availability.reason ?? null,
        model: context.config.anthropicModel,
        limits: {
          maxOutputTokens: context.config.aiMaxOutputTokens,
          maxCostUsd: context.config.aiMaxCostUsd,
        },
        worstCaseCostEstimateUsd: Number(worstCase.toFixed(4)),
        note: 'The API key is read from the environment only and is never printed, logged or stored.',
      });
      return availability.available ? EXIT_CODES.OK : EXIT_CODES.UNSUPPORTED;
    }

    printLine('sah ai doctor');
    printLine();
    renderTable([
      ['ANTHROPIC_API_KEY', availability.hasApiKey ? 'set (value never shown)' : 'not set'],
      ['model', context.config.anthropicModel],
      ['max output tokens', String(context.config.aiMaxOutputTokens)],
      ['spend limit (per command)', `$${context.config.aiMaxCostUsd.toFixed(2)}`],
      ['worst-case estimate', `$${worstCase.toFixed(4)} for a typical request`],
    ]);
    printLine();

    if (!availability.available) {
      printLine(availability.reason ?? 'AI integration unavailable.');
      printLine();
      printLine('Every other part of this toolkit works without an API key.');
      printLine('Claude Code itself does not need this key — it uses your normal Claude login.');
      return EXIT_CODES.UNSUPPORTED;
    }

    printLine('AI integration is available.');
    printLine('WARNING: running "sah ai" commands calls the Anthropic API and may incur charges.');
    return EXIT_CODES.OK;
  }

  // --- Commands that would call the API ---------------------------------------
  if (!availability.available) {
    const message = availability.reason ?? 'ANTHROPIC_API_KEY is not set.';
    if (options.json) {
      printJson({
        ok: false,
        command: `ai ${options.subcommand}`,
        error: message,
        hint: 'Set ANTHROPIC_API_KEY, or use Claude Code with the local MCP server instead ("sah mcp start").',
      });
    } else {
      printError(message);
      printError('');
      printError('Alternatives that need no API key:');
      printError("  - Use Claude Code with this repository's MCP server: sah mcp start");
      printError('  - Run "sah registry search" and "sah validate" directly.');
    }
    return EXIT_CODES.UNSUPPORTED;
  }

  // The guardrails, prompt construction and proposal validation are implemented
  // in @sah/ai. What is NOT yet wired is the interactive diff-and-confirm step
  // that must sit between a model proposal and any file being written. Rather
  // than write files without that review gate, these commands stop here and say so.
  const message = [
    `"sah ai ${options.subcommand}" is not fully implemented yet.`,
    '',
    'What exists: the Anthropic client, the spending safeguards, secret redaction,',
    'the schema parser and the registry-reference checker that rejects any proposal',
    'referencing unverified game content (see @sah/ai).',
    '',
    'What is missing: the interactive diff-and-confirm step that must run before',
    'anything a model proposes is written to disk. Until that exists, these commands',
    'refuse rather than write unreviewed output.',
    '',
    'Use Claude Code with the local MCP server instead — it provides the same',
    'assistance with a review step you already trust:',
    '  sah mcp start',
  ].join('\n');

  if (options.json) {
    printJson({
      ok: false,
      command: `ai ${options.subcommand}`,
      status: 'not-implemented',
      implemented: [
        'anthropic client',
        'spending safeguards',
        'secret redaction',
        'schema parsing of proposals',
        'registry reference checking',
      ],
      missing: ['interactive diff and confirmation before writing files'],
      alternative: 'sah mcp start',
    });
  } else {
    printError(message);
  }
  return EXIT_CODES.UNSUPPORTED;
}
