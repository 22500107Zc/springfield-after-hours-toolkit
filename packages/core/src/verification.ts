/**
 * The verification vocabulary used across every registry record, capability
 * entry and preset setting in this toolkit.
 *
 * This is the mechanism that keeps invented game facts out of a build. A record
 * that cannot be backed by a source must not claim to be `verified`.
 */
export const VERIFICATION_STATUSES = [
  /** Proven by official documentation or upstream source code, with provenance. */
  'verified',
  /** Implemented or described here, but not confirmed against a real game. */
  'experimental',
  /** Asserted by a community source; not independently checked. */
  'community-reported',
  /** Recorded as a name only. Semantics unknown. */
  'unverified',
  /** Known not to work. */
  'unsupported',
  /** Intended, but not implemented. */
  'planned',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/**
 * Statuses a build will accept for a referenced record without an explicit
 * per-reference opt-in.
 *
 * `unverified` is deliberately excluded: a name with unknown semantics is
 * exactly the kind of thing that produces a mod that silently does nothing.
 */
export const BUILDABLE_STATUSES: readonly VerificationStatus[] = ['verified', 'experimental'];

export function isBuildable(status: VerificationStatus): boolean {
  return BUILDABLE_STATUSES.includes(status);
}

/**
 * Ranks statuses by confidence, most confident first. Used to sort search
 * results so that verified records surface above speculative ones.
 */
export function confidenceRank(status: VerificationStatus): number {
  return VERIFICATION_STATUSES.indexOf(status);
}
