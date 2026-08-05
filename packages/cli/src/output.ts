import { formatDiagnostic, type Diagnostic, type DiagnosticSummary } from '@sah/core';

/**
 * Output helpers.
 *
 * Every command supports `--json`. Human output goes to stdout; the JSON form
 * is the same information with no prose, so scripts never have to parse text.
 */

export interface JsonEnvelope {
  ok: boolean;
  command: string;
  [key: string]: unknown;
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printLine(text = ''): void {
  process.stdout.write(`${text}\n`);
}

export function printError(text: string): void {
  process.stderr.write(`${text}\n`);
}

export function renderDiagnostics(diagnostics: readonly Diagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const target = diagnostic.severity === 'error' ? printError : printLine;
    target(formatDiagnostic(diagnostic));
  }
}

export function renderSummary(summary: DiagnosticSummary): void {
  const parts: string[] = [];
  parts.push(`${summary.errors} error${summary.errors === 1 ? '' : 's'}`);
  parts.push(`${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`);
  if (summary.infos > 0) parts.push(`${summary.infos} note${summary.infos === 1 ? '' : 's'}`);
  printLine(parts.join(', '));
}

/** Renders a simple aligned two-column table. */
export function renderTable(rows: ReadonlyArray<[string, string]>, indent = '  '): void {
  const width = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
  for (const [label, value] of rows) {
    printLine(`${indent}${label.padEnd(width)}  ${value}`);
  }
}
