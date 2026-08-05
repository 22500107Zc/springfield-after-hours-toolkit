import type { Diagnostic, ProvenanceIndex, VerificationStatus } from '@sah/core';
import type { RegistryKind, RegistryRecordBase } from '@sah/schemas';

/** A registry record after loading and validation, tagged with its kind. */
export interface LoadedRecord extends RegistryRecordBase {
  kind: RegistryKind;
  /** File the record was loaded from, for diagnostics. */
  sourceFile: string;
  /** Kind-specific fields, preserved as-is. */
  [key: string]: unknown;
}

export interface RegistrySet {
  /** All records, keyed by kind then id. */
  byKind: Map<RegistryKind, Map<string, LoadedRecord>>;
  provenance: ProvenanceIndex;
  /** Problems found while loading the registry files themselves. */
  diagnostics: Diagnostic[];
  /** Directories the registries were loaded from, in precedence order. */
  roots: string[];
}

export interface RegistryLookupResult {
  record: LoadedRecord | undefined;
  /** True when the id resolved via an alias rather than the canonical id. */
  viaAlias: boolean;
}

export interface SearchHit {
  record: LoadedRecord;
  /** Higher is better. */
  score: number;
  matchedOn: 'id' | 'displayName' | 'alias' | 'gameCode' | 'tag' | 'notes';
}

export interface SearchOptions {
  kind?: RegistryKind;
  /** Restrict results to these statuses. */
  statuses?: readonly VerificationStatus[];
  limit?: number;
}
