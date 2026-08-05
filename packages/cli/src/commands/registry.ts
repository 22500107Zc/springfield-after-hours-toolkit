import {
  EXIT_CODES,
  ProvenanceIndex,
  VERIFICATION_STATUSES,
  type ExitCode,
  type VerificationStatus,
} from '@sah/core';
import { REGISTRY_KINDS, type RegistryKind } from '@sah/schemas';
import { listRecords, registryCounts, searchRegistries } from '@sah/registry';
import { createContext } from '../context.js';
import { printError, printJson, printLine, renderDiagnostics, renderTable } from '../output.js';

/**
 * Maps the singular words people naturally type to registry kinds, so
 * `sah registry search location "Java Server"` works as documented.
 */
const KIND_ALIASES: Record<string, RegistryKind> = {
  location: 'locations',
  locations: 'locations',
  map: 'maps',
  maps: 'maps',
  level: 'levels',
  levels: 'levels',
  interior: 'interiors',
  interiors: 'interiors',
  locator: 'locators',
  locators: 'locators',
  character: 'characters',
  characters: 'characters',
  vehicle: 'vehicles',
  vehicles: 'vehicles',
  objective: 'objectives',
  objectives: 'objectives',
  condition: 'conditions',
  conditions: 'conditions',
  command: 'commands',
  commands: 'commands',
  hack: 'hacks',
  hacks: 'hacks',
  asset: 'assets',
  assets: 'assets',
  'hud-icon': 'hud-icons',
  'hud-icons': 'hud-icons',
  'preset-capability': 'preset-capabilities',
  'preset-capabilities': 'preset-capabilities',
  'compatibility-profile': 'compatibility-profiles',
  'compatibility-profiles': 'compatibility-profiles',
};

export function resolveKind(input: string): RegistryKind | undefined {
  return KIND_ALIASES[input.toLowerCase()];
}

export function runRegistryValidate(options: { json: boolean }): ExitCode {
  const context = createContext();
  const counts = registryCounts(context.registries);
  const errors = context.registries.diagnostics.filter((d) => d.severity === 'error');
  const ok = errors.length === 0;

  if (options.json) {
    printJson({
      ok,
      command: 'registry validate',
      roots: context.registries.roots,
      counts,
      sources: context.registries.provenance.all().map((s) => s.id),
      diagnostics: context.registries.diagnostics,
    });
    return ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  }

  printLine('Registry validation');
  printLine();
  printLine('Loaded from:');
  for (const root of context.registries.roots) printLine(`  ${root}`);
  printLine();

  renderTable(
    REGISTRY_KINDS.map((kind) => {
      const count = counts[kind] ?? 0;
      return [kind, count === 0 ? '0  (nothing verified yet)' : String(count)] as [string, string];
    }),
  );

  printLine();
  printLine(`${context.registries.provenance.all().length} provenance source(s) declared.`);

  if (!ok) {
    printLine();
    renderDiagnostics(context.registries.diagnostics);
    return EXIT_CODES.VALIDATION_FAILED;
  }

  printLine();
  printLine('All registry records are schema-valid and cite a known provenance source.');
  return EXIT_CODES.OK;
}

export interface RegistrySearchOptions {
  kind?: string;
  query: string;
  status?: string;
  limit: number;
  json: boolean;
}

export function runRegistrySearch(options: RegistrySearchOptions): ExitCode {
  const context = createContext();

  let kind: RegistryKind | undefined;
  if (options.kind) {
    kind = resolveKind(options.kind);
    if (!kind) {
      printError(
        `Unknown registry "${options.kind}". Known registries: ${REGISTRY_KINDS.join(', ')}`,
      );
      return EXIT_CODES.USAGE;
    }
  }

  let statuses: VerificationStatus[] | undefined;
  if (options.status) {
    const requested = options.status.split(',').map((s) => s.trim()) as VerificationStatus[];
    const invalid = requested.filter((s) => !VERIFICATION_STATUSES.includes(s));
    if (invalid.length > 0) {
      printError(
        `Unknown status ${invalid.join(', ')}. Known statuses: ${VERIFICATION_STATUSES.join(', ')}`,
      );
      return EXIT_CODES.USAGE;
    }
    statuses = requested;
  }

  const hits = searchRegistries(context.registries, options.query, {
    ...(kind ? { kind } : {}),
    ...(statuses ? { statuses } : {}),
    limit: options.limit,
  });

  if (options.json) {
    printJson({
      ok: true,
      command: 'registry search',
      query: options.query,
      kind: kind ?? null,
      count: hits.length,
      results: hits.map((hit) => ({
        registry: hit.record.kind,
        id: hit.record.id,
        displayName: hit.record.displayName,
        gameCode: hit.record.gameCode ?? null,
        verificationStatus: hit.record.verificationStatus,
        matchedOn: hit.matchedOn,
        provenance: hit.record.provenance,
        notes: hit.record.notes,
      })),
    });
    return EXIT_CODES.OK;
  }

  if (hits.length === 0) {
    printLine(`No verified record matches "${options.query}"${kind ? ` in ${kind}` : ''}.`);
    printLine();
    printLine('That is a real answer, not a search failure: if a record is not in the');
    printLine('registry, this toolkit has no evidence the thing exists, and a campaign');
    printLine('referencing it will not build.');
    printLine();
    printLine('If you can cite a source for it, add it — see docs/registries/README.md.');
    return EXIT_CODES.OK;
  }

  printLine(`${hits.length} result(s) for "${options.query}"`);
  printLine();

  for (const hit of hits) {
    const record = hit.record;
    printLine(`${record.kind}:${record.id}  [${record.verificationStatus}]`);
    printLine(
      `  ${record.displayName}${record.gameCode ? `  (game code: ${record.gameCode})` : ''}`,
    );

    const { resolved } = context.registries.provenance.resolve(record.provenance);
    for (const source of resolved) {
      printLine(`  source: ${ProvenanceIndex.cite(source)}`);
    }
    if (record.provenance.detail) {
      printLine(`  detail: ${record.provenance.detail}`);
    }
    for (const note of record.notes) printLine(`  note: ${note}`);
    printLine();
  }

  return EXIT_CODES.OK;
}

export function runRegistryList(options: { kind: string; json: boolean }): ExitCode {
  const context = createContext();
  const kind = resolveKind(options.kind);
  if (!kind) {
    printError(
      `Unknown registry "${options.kind}". Known registries: ${REGISTRY_KINDS.join(', ')}`,
    );
    return EXIT_CODES.USAGE;
  }

  const records = listRecords(context.registries, kind);

  if (options.json) {
    printJson({ ok: true, command: 'registry list', kind, count: records.length, records });
    return EXIT_CODES.OK;
  }

  if (records.length === 0) {
    printLine(`The ${kind} registry is empty — nothing has been verified from a citable source.`);
    return EXIT_CODES.OK;
  }

  renderTable(
    records.map(
      (record) =>
        [`${record.id}`, `${record.verificationStatus.padEnd(18)} ${record.displayName}`] as [
          string,
          string,
        ],
    ),
  );
  printLine();
  printLine(`${records.length} record(s).`);
  return EXIT_CODES.OK;
}
