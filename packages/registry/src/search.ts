import { confidenceRank } from '@sah/core';
import type { RegistryKind } from '@sah/schemas';
import type { LoadedRecord, RegistrySet, SearchHit, SearchOptions } from './types.js';

/**
 * Substring search across registry records.
 *
 * Deliberately simple and deterministic: no fuzzy matching, no ranking model.
 * A modder searching for "Java Server" should get *nothing* if nothing is
 * verified, not a confident near-miss that invites them to use it anyway.
 */
/**
 * Normalises a string for comparison so that separators do not defeat a search.
 *
 * People type "Java Server" and "time of day"; registry ids are written
 * `java-server` and `live-time-of-day`. Treating spaces, hyphens and
 * underscores as equivalent is the difference between a search that answers the
 * question and one that wrongly implies the content does not exist.
 */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

export function searchRegistries(
  registries: RegistrySet,
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const needle = normalise(query);
  if (needle.length === 0) return [];

  const kinds: RegistryKind[] = options.kind
    ? [options.kind]
    : [...registries.byKind.keys()].sort();

  const hits: SearchHit[] = [];

  for (const kind of kinds) {
    const bucket = registries.byKind.get(kind);
    if (!bucket) continue;

    for (const record of bucket.values()) {
      if (options.statuses && !options.statuses.includes(record.verificationStatus)) continue;
      const hit = scoreRecord(record, needle);
      if (hit) hits.push(hit);
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const byConfidence =
      confidenceRank(a.record.verificationStatus) - confidenceRank(b.record.verificationStatus);
    if (byConfidence !== 0) return byConfidence;
    if (a.record.kind !== b.record.kind) return a.record.kind.localeCompare(b.record.kind);
    return a.record.id.localeCompare(b.record.id);
  });

  return typeof options.limit === 'number' ? hits.slice(0, options.limit) : hits;
}

function scoreRecord(record: LoadedRecord, needle: string): SearchHit | undefined {
  const id = normalise(record.id);
  if (id === needle) return { record, score: 100, matchedOn: 'id' };

  const displayName = normalise(record.displayName);
  if (displayName === needle) return { record, score: 95, matchedOn: 'displayName' };

  const gameCode = record.gameCode ? normalise(record.gameCode) : undefined;
  if (gameCode === needle) return { record, score: 90, matchedOn: 'gameCode' };

  for (const alias of record.aliases) {
    if (normalise(alias) === needle) return { record, score: 85, matchedOn: 'alias' };
  }

  if (id.includes(needle)) return { record, score: 60, matchedOn: 'id' };
  if (displayName.includes(needle)) return { record, score: 55, matchedOn: 'displayName' };
  if (gameCode?.includes(needle)) return { record, score: 50, matchedOn: 'gameCode' };
  for (const alias of record.aliases) {
    if (normalise(alias).includes(needle)) return { record, score: 45, matchedOn: 'alias' };
  }
  for (const tag of record.tags) {
    if (normalise(tag).includes(needle)) return { record, score: 30, matchedOn: 'tag' };
  }
  for (const note of record.notes) {
    if (normalise(note).includes(needle)) return { record, score: 10, matchedOn: 'notes' };
  }

  return undefined;
}
