/**
 * Provenance: where a recorded fact came from.
 *
 * Every registry record must point at a source. Generated output records which
 * sources contributed to it, so a reader of a built mod can trace any claim
 * back to the document or commit that justified it.
 */

export const SOURCE_TYPES = [
  /** A page of official vendor documentation. */
  'official-documentation',
  /** A file at a pinned commit in an official repository. */
  'official-repository',
  /** A file supplied by the user from their own game installation. */
  'user-supplied-game-file',
  /** A file supplied by the user from a third-party mod they installed. */
  'user-supplied-mod-file',
  /** A community forum, wiki or Discord message. */
  'community-reference',
  /** Someone ran the game and observed this directly. */
  'manual-observation',
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

// Optional properties are written as `?: T | undefined` throughout, because the
// repository compiles with `exactOptionalPropertyTypes` and these shapes are
// produced by Zod parsers that emit explicit `undefined`.

export interface ProvenanceSource {
  /** Stable identifier referenced by registry records. */
  id: string;
  type: SourceType;
  title: string;
  /** Public URL, when the source is a public document or repository. */
  url?: string | undefined;
  /** Publisher or author of the source. */
  publisher?: string | undefined;
  /** Commit SHA, for `official-repository` sources. */
  commit?: string | undefined;
  /** Path within the repository, for `official-repository` sources. */
  path?: string | undefined;
  /** ISO-8601 date the source was retrieved or observed. */
  retrievedAt?: string | undefined;
  /** Licence of the source material, where known. */
  license?: string | undefined;
  notes?: string | undefined;
}

/** A registry record's pointer at one or more sources. */
export interface ProvenanceRef {
  /** Ids of `ProvenanceSource` records that justify this entry. */
  sources: string[];
  /** Free-text detail, e.g. which table or section within the source. */
  detail?: string | undefined;
}

export class ProvenanceIndex {
  readonly #sources = new Map<string, ProvenanceSource>();

  constructor(sources: readonly ProvenanceSource[] = []) {
    for (const source of sources) this.add(source);
  }

  add(source: ProvenanceSource): void {
    this.#sources.set(source.id, source);
  }

  get(id: string): ProvenanceSource | undefined {
    return this.#sources.get(id);
  }

  has(id: string): boolean {
    return this.#sources.has(id);
  }

  all(): ProvenanceSource[] {
    return [...this.#sources.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Resolves a ref to full source records, reporting any ids it cannot find. */
  resolve(ref: ProvenanceRef): { resolved: ProvenanceSource[]; missing: string[] } {
    const resolved: ProvenanceSource[] = [];
    const missing: string[] = [];
    for (const id of ref.sources) {
      const source = this.#sources.get(id);
      if (source) resolved.push(source);
      else missing.push(id);
    }
    return { resolved, missing };
  }

  /**
   * Renders a short human-readable citation, e.g. for build manifests and
   * `sah registry search` output.
   */
  static cite(source: ProvenanceSource): string {
    switch (source.type) {
      case 'official-repository': {
        const at = source.commit ? `@${source.commit.slice(0, 12)}` : '';
        return `${source.title}${source.path ? ` (${source.path})` : ''}${at}`;
      }
      case 'official-documentation':
        return source.url ? `${source.title} <${source.url}>` : source.title;
      default:
        return source.title;
    }
  }
}
