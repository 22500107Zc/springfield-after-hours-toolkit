/**
 * Diagnostics are the toolkit's only currency for "something is wrong".
 * Validation, compilation and the MCP tools all speak this shape so that a
 * human reading a terminal, a script reading JSON, and Claude Code reading an
 * MCP response all see the same thing.
 */

export type Severity = 'error' | 'warning' | 'info';

/**
 * Stable diagnostic codes. These are part of the toolkit's public contract:
 * `sah explain <code>` and the MCP `explain_diagnostic` tool key off them, and
 * they must not be renumbered once released.
 */
export const DIAGNOSTIC_CODES = {
  // 1000 — document structure
  SCHEMA_INVALID: 'SAH1001',
  DUPLICATE_ID: 'SAH1002',
  MISSING_PROVENANCE: 'SAH1003',
  DOCUMENT_UNREADABLE: 'SAH1004',
  EMPTY_CAMPAIGN: 'SAH1005',

  // 2000 — unresolved references into game content
  UNRESOLVED_LOCATION: 'SAH2000',
  UNRESOLVED_LOCATOR: 'SAH2001',
  UNRESOLVED_CHARACTER: 'SAH2002',
  UNRESOLVED_VEHICLE: 'SAH2003',
  UNRESOLVED_LEVEL: 'SAH2004',
  UNRESOLVED_HUD_ICON: 'SAH2005',
  UNRESOLVED_MISSION_REF: 'SAH2006',
  UNRESOLVED_CONVERSATION: 'SAH2007',
  UNRESOLVED_SPEAKER: 'SAH2008',
  UNRESOLVED_PRESET: 'SAH2009',

  // 2100 — references that resolve but are not trustworthy enough to build
  REFERENCE_NOT_BUILDABLE: 'SAH2100',
  EXPERIMENTAL_REFERENCE: 'SAH2101',
  UNVERIFIED_OVERRIDE_USED: 'SAH2102',

  // 3000 — unsupported mechanics
  UNSUPPORTED_OBJECTIVE: 'SAH3000',
  UNSUPPORTED_CONDITION: 'SAH3001',
  UNSUPPORTED_COMMAND: 'SAH3002',
  COMMAND_ARITY: 'SAH3003',
  COMMAND_SCOPE: 'SAH3004',
  MISSING_REQUIRED_HACK: 'SAH3005',
  RAW_LUA_NOT_OPTED_IN: 'SAH3006',

  // 4000 — structural / flow problems
  IMPOSSIBLE_STAGE_TRANSITION: 'SAH4000',
  UNREACHABLE_STAGE: 'SAH4001',
  MISSION_WITHOUT_STAGES: 'SAH4002',
  STAGE_WITHOUT_OBJECTIVE: 'SAH4003',

  // 5000 — dialogue
  DIALOGUE_MISSING_TEXT: 'SAH5000',
  DIALOGUE_MISSING_AUDIO: 'SAH5001',
  DIALOGUE_UNRESOLVED_REFERENCE: 'SAH5002',
  DIALOGUE_EXPORT_UNSUPPORTED: 'SAH5003',

  // 6000 — output and filesystem safety
  UNSAFE_OUTPUT_PATH: 'SAH6000',
  OUTPUT_COLLISION: 'SAH6001',
  MALFORMED_WINDOWS_PATH: 'SAH6002',
  PATH_CASING: 'SAH6003',
  ASSET_MISSING: 'SAH6004',

  // 7000 — environment / compatibility
  COMPAT_DEPENDENCY_MISSING: 'SAH7000',
  PLATFORM_LIMITATION: 'SAH7001',
  UPSTREAM_MISSING: 'SAH7002',
} as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[keyof typeof DIAGNOSTIC_CODES];

export interface DiagnosticLocation {
  /** Path relative to the campaign root, using forward slashes. */
  file?: string;
  /** Dotted path into the document, e.g. `missions[0].stages[1].objective`. */
  pointer?: string;
  line?: number;
  column?: number;
}

export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;
  /** One sentence stating what is wrong. */
  message: string;
  location?: DiagnosticLocation;
  /** What the author should do about it. */
  hint?: string;
  /** The identifier that could not be resolved, when applicable. */
  reference?: string;
  /** Registry kind the reference was looked up in, when applicable. */
  registry?: string;
}

export class DiagnosticBag {
  readonly #items: Diagnostic[] = [];

  add(diagnostic: Diagnostic): void {
    this.#items.push(diagnostic);
  }

  error(code: DiagnosticCode, message: string, rest: Partial<Diagnostic> = {}): void {
    this.add({ ...rest, code, severity: 'error', message });
  }

  warn(code: DiagnosticCode, message: string, rest: Partial<Diagnostic> = {}): void {
    this.add({ ...rest, code, severity: 'warning', message });
  }

  info(code: DiagnosticCode, message: string, rest: Partial<Diagnostic> = {}): void {
    this.add({ ...rest, code, severity: 'info', message });
  }

  extend(diagnostics: readonly Diagnostic[]): void {
    this.#items.push(...diagnostics);
  }

  get items(): readonly Diagnostic[] {
    return this.#items;
  }

  get errors(): Diagnostic[] {
    return this.#items.filter((d) => d.severity === 'error');
  }

  get warnings(): Diagnostic[] {
    return this.#items.filter((d) => d.severity === 'warning');
  }

  get hasErrors(): boolean {
    return this.#items.some((d) => d.severity === 'error');
  }

  /**
   * Deterministic ordering so that two runs over the same input emit the same
   * report — required for golden-fixture tests.
   */
  sorted(): Diagnostic[] {
    const weight: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
    return [...this.#items].sort((a, b) => {
      const bySeverity = weight[a.severity] - weight[b.severity];
      if (bySeverity !== 0) return bySeverity;
      const byFile = (a.location?.file ?? '').localeCompare(b.location?.file ?? '');
      if (byFile !== 0) return byFile;
      const byPointer = (a.location?.pointer ?? '').localeCompare(b.location?.pointer ?? '');
      if (byPointer !== 0) return byPointer;
      const byCode = a.code.localeCompare(b.code);
      if (byCode !== 0) return byCode;
      return a.message.localeCompare(b.message);
    });
  }

  summary(): DiagnosticSummary {
    return {
      errors: this.items.filter((d) => d.severity === 'error').length,
      warnings: this.items.filter((d) => d.severity === 'warning').length,
      infos: this.items.filter((d) => d.severity === 'info').length,
    };
  }
}

export interface DiagnosticSummary {
  errors: number;
  warnings: number;
  infos: number;
}

/** Renders one diagnostic for a terminal, without colour. */
export function formatDiagnostic(d: Diagnostic): string {
  const where = [d.location?.file, d.location?.pointer].filter(Boolean).join(' ');
  const head = `${d.severity} ${d.code}${where ? ` at ${where}` : ''}`;
  const lines = [`${head}: ${d.message}`];
  if (d.hint) lines.push(`  hint: ${d.hint}`);
  return lines.join('\n');
}
