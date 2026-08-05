import fs from 'node:fs';
import path from 'node:path';
import {
  DIAGNOSTIC_CODES,
  ProvenanceIndex,
  findUpwards,
  listFiles,
  moduleDirectory,
  readDocument,
  type Diagnostic,
  type ProvenanceSource,
} from '@sah/core';
import {
  ProvenanceFileSchema,
  RegistryFileSchema,
  recordSchemaFor,
  type RegistryKind,
} from '@sah/schemas';
import type { LoadedRecord, RegistrySet } from './types.js';

/**
 * Locates the repository's `data` directory.
 *
 * Walks up from this module rather than assuming a fixed depth, so it works
 * from `src/` under Vitest and from `dist/` in a build.
 */
export function builtinDataDirectory(): string | undefined {
  const start = moduleDirectory(import.meta.url);
  const root = findUpwards(start, path.join('data', 'registries'));
  return root ? path.join(root, 'data') : undefined;
}

export interface LoadRegistryOptions {
  /**
   * Directories containing `registries/` and optionally `provenance/`.
   * Later entries override earlier ones, so a campaign can extend the
   * built-in registries without editing them.
   */
  dataDirectories?: string[];
  /** Skip the built-in `data` directory. Used in tests. */
  includeBuiltin?: boolean;
}

function loadProvenance(dataDir: string, diagnostics: Diagnostic[]): ProvenanceSource[] {
  const file = path.join(dataDir, 'provenance', 'sources.yaml');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = ProvenanceFileSchema.safeParse(readDocument(file));
    if (!parsed.success) {
      diagnostics.push({
        code: DIAGNOSTIC_CODES.SCHEMA_INVALID,
        severity: 'error',
        message: `Provenance file is invalid: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
        location: { file },
      });
      return [];
    }
    return parsed.data.sources;
  } catch (error) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
      severity: 'error',
      message: `Could not read provenance file: ${(error as Error).message}`,
      location: { file },
    });
    return [];
  }
}

/**
 * Loads every registry file it can find, validating each record against the
 * schema for its kind.
 *
 * A record that fails validation is DROPPED and reported, rather than being
 * loaded in a half-valid state — a malformed record must never be usable as
 * evidence that a game fact exists.
 */
export function loadRegistries(options: LoadRegistryOptions = {}): RegistrySet {
  const diagnostics: Diagnostic[] = [];
  const roots: string[] = [];

  if (options.includeBuiltin !== false) {
    const builtin = builtinDataDirectory();
    if (builtin) roots.push(builtin);
    else {
      diagnostics.push({
        code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
        severity: 'error',
        message:
          'Could not locate the built-in data/registries directory. The toolkit installation looks incomplete.',
        hint: 'Run the CLI from inside the repository, or set SAH_REGISTRY_DIR.',
      });
    }
  }
  roots.push(...(options.dataDirectories ?? []));

  const byKind = new Map<RegistryKind, Map<string, LoadedRecord>>();
  const provenanceSources: ProvenanceSource[] = [];

  for (const root of roots) {
    provenanceSources.push(...loadProvenance(root, diagnostics));

    const registryDir = path.join(root, 'registries');
    for (const file of listFiles(registryDir, ['.yaml', '.yml', '.json'])) {
      let raw: unknown;
      try {
        raw = readDocument(file);
      } catch (error) {
        diagnostics.push({
          code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
          severity: 'error',
          message: `Could not parse registry file: ${(error as Error).message}`,
          location: { file },
        });
        continue;
      }

      const parsedFile = RegistryFileSchema.safeParse(raw);
      if (!parsedFile.success) {
        diagnostics.push({
          code: DIAGNOSTIC_CODES.SCHEMA_INVALID,
          severity: 'error',
          message: `Registry file header is invalid: ${parsedFile.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')}`,
          location: { file },
        });
        continue;
      }

      const kind = parsedFile.data.registry;
      const schema = recordSchemaFor(kind);
      const bucket = byKind.get(kind) ?? new Map<string, LoadedRecord>();
      byKind.set(kind, bucket);

      parsedFile.data.records.forEach((rawRecord, index) => {
        const parsedRecord = schema.safeParse(rawRecord);
        if (!parsedRecord.success) {
          diagnostics.push({
            code: DIAGNOSTIC_CODES.SCHEMA_INVALID,
            severity: 'error',
            message: `Registry record is invalid and was not loaded: ${parsedRecord.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')}`,
            location: { file, pointer: `records[${index}]` },
            registry: kind,
          });
          return;
        }

        const record = parsedRecord.data as LoadedRecord;
        record.kind = kind;
        record.sourceFile = file;

        const existing = bucket.get(record.id);
        if (existing && existing.sourceFile === file) {
          diagnostics.push({
            code: DIAGNOSTIC_CODES.DUPLICATE_ID,
            severity: 'error',
            message: `Duplicate ${kind} record id "${record.id}" within the same file.`,
            location: { file, pointer: `records[${index}]` },
            reference: record.id,
            registry: kind,
          });
          return;
        }

        // A later data directory intentionally overrides an earlier one.
        bucket.set(record.id, record);
      });
    }
  }

  const provenance = new ProvenanceIndex(provenanceSources);

  // Every record must cite a source that actually exists.
  for (const [kind, bucket] of byKind) {
    for (const record of bucket.values()) {
      const { missing } = provenance.resolve(record.provenance);
      for (const id of missing) {
        diagnostics.push({
          code: DIAGNOSTIC_CODES.MISSING_PROVENANCE,
          severity: 'error',
          message: `${kind} record "${record.id}" cites unknown provenance source "${id}".`,
          location: { file: record.sourceFile },
          hint: `Add a source with id "${id}" to data/provenance/sources.yaml, or correct the reference.`,
          reference: record.id,
          registry: kind,
        });
      }
    }
  }

  return { byKind, provenance, diagnostics, roots };
}

export function getRecord(
  registries: RegistrySet,
  kind: RegistryKind,
  id: string,
): LoadedRecord | undefined {
  return registries.byKind.get(kind)?.get(id);
}

/** Resolves an id, falling back to a case-insensitive alias or gameCode match. */
export function resolveRecord(
  registries: RegistrySet,
  kind: RegistryKind,
  reference: string,
): { record: LoadedRecord | undefined; viaAlias: boolean } {
  const bucket = registries.byKind.get(kind);
  if (!bucket) return { record: undefined, viaAlias: false };

  const direct = bucket.get(reference);
  if (direct) return { record: direct, viaAlias: false };

  const needle = reference.toLowerCase();
  for (const record of bucket.values()) {
    if (record.gameCode?.toLowerCase() === needle) return { record, viaAlias: true };
    if (record.aliases.some((alias) => alias.toLowerCase() === needle)) {
      return { record, viaAlias: true };
    }
  }
  return { record: undefined, viaAlias: false };
}

export function listRecords(registries: RegistrySet, kind: RegistryKind): LoadedRecord[] {
  const bucket = registries.byKind.get(kind);
  if (!bucket) return [];
  return [...bucket.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function registryCounts(registries: RegistrySet): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [kind, bucket] of registries.byKind) counts[kind] = bucket.size;
  return counts;
}
