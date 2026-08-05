import { hasAnthropicApiKey } from '@sah/core';

/**
 * Guardrails for the optional Anthropic integration.
 *
 * Three rules this module enforces:
 *   1. The API key is read from the environment, never from config, and its
 *      value is never returned, logged or included in any output.
 *   2. Nothing the model produces reaches a build. It is parsed against the
 *      schema, validated against the registries, shown as a diff, and only
 *      written after the user confirms.
 *   3. Only campaign structure is ever sent. No binary assets, no game files,
 *      no environment variables, no credentials.
 */

export interface AiAvailability {
  available: boolean;
  reason?: string;
  /** True when a key is present. The key itself is never exposed. */
  hasApiKey: boolean;
}

export function checkAiAvailability(env: NodeJS.ProcessEnv = process.env): AiAvailability {
  const hasKey = hasAnthropicApiKey(env);
  if (!hasKey) {
    return {
      available: false,
      hasApiKey: false,
      reason:
        'ANTHROPIC_API_KEY is not set. The AI commands are optional; every other part of the toolkit works without it.',
    };
  }
  return { available: true, hasApiKey: true };
}

export interface SpendingLimits {
  maxOutputTokens: number;
  maxCostUsd: number;
  model: string;
}

/**
 * Rough per-command cost ceiling.
 *
 * This is a safeguard, not an invoice. It uses a deliberately pessimistic
 * assumption so that it errs towards refusing rather than surprising someone
 * with a bill.
 */
export function estimateWorstCaseCostUsd(
  limits: SpendingLimits,
  estimatedInputTokens: number,
): number {
  // Pessimistic blended rates in USD per million tokens. Deliberately high:
  // the point is to refuse before spending, not to predict the exact charge.
  const inputPerMillion = 15;
  const outputPerMillion = 75;
  return (
    (estimatedInputTokens / 1_000_000) * inputPerMillion +
    (limits.maxOutputTokens / 1_000_000) * outputPerMillion
  );
}

export interface SpendCheck {
  allowed: boolean;
  estimatedCostUsd: number;
  reason?: string;
}

export function checkSpendingLimit(
  limits: SpendingLimits,
  estimatedInputTokens: number,
): SpendCheck {
  const estimate = estimateWorstCaseCostUsd(limits, estimatedInputTokens);
  if (estimate > limits.maxCostUsd) {
    return {
      allowed: false,
      estimatedCostUsd: estimate,
      reason: `Estimated worst-case cost $${estimate.toFixed(
        4,
      )} exceeds the configured limit of $${limits.maxCostUsd.toFixed(2)}. Raise aiMaxCostUsd, or reduce aiMaxOutputTokens.`,
    };
  }
  return { allowed: true, estimatedCostUsd: estimate };
}

/** Very rough token estimate. Used only for the spending safeguard. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Strips anything that must never leave the machine.
 *
 * Campaign YAML is text the user wrote, so it is safe to send. This guard
 * exists to catch mistakes — an author who pasted a key into a notes field, for
 * example.
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /sk-ant-[A-Za-z0-9_-]{10,}/g, label: '[redacted-anthropic-key]' },
  { pattern: /\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{20,}\b/g, label: '[redacted-github-token]' },
  { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, label: '[redacted-aws-key]' },
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    label: '[redacted-private-key]',
  },
];

export interface RedactionResult {
  text: string;
  redactions: number;
}

export function redactSecrets(text: string): RedactionResult {
  let output = text;
  let count = 0;
  for (const { pattern, label } of SECRET_PATTERNS) {
    output = output.replace(pattern, () => {
      count += 1;
      return label;
    });
  }
  return { text: output, redactions: count };
}

/** File extensions that must never be sent to an API. */
const BINARY_EXTENSIONS = [
  '.p3d',
  '.rcf',
  '.rsd',
  '.bik',
  '.exe',
  '.dll',
  '.zip',
  '.7z',
  '.rar',
  '.wav',
  '.mp3',
  '.ogg',
  '.png',
  '.jpg',
  '.jpeg',
  '.dds',
  '.tga',
];

export function isSendable(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return !BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
