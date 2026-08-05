import { createHash } from 'node:crypto';

/** SHA-256 of a buffer or string, hex encoded. Used for build manifests. */
export function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Serialises a value to JSON with keys sorted at every level.
 *
 * Deterministic build output is a hard requirement, and `JSON.stringify` alone
 * preserves insertion order — which varies with how an object was constructed.
 */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(sortValue(value), null, indent);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

/** Normalises text output: LF endings and exactly one trailing newline. */
export function normaliseText(text: string): string {
  return `${text.replace(/\r\n/g, '\n').replace(/\s+$/, '')}\n`;
}
