import type { SahConfig } from '@sah/core';
import { checkSpendingLimit, estimateTokens, redactSecrets } from './guardrails.js';

/**
 * Thin wrapper over the Anthropic SDK.
 *
 * The SDK is imported lazily so that the toolkit — and its tests — never load
 * it, or require a key, unless an `sah ai` command is actually run.
 */

export interface AiRequest {
  system: string;
  prompt: string;
  config: SahConfig;
}

export interface AiResponse {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  /** Number of secret-looking strings scrubbed from the prompt before sending. */
  redactions: number;
}

export class AiRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRefusal';
  }
}

export async function requestCompletion(request: AiRequest): Promise<AiResponse> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey || apiKey.trim().length === 0) {
    throw new AiRefusal('ANTHROPIC_API_KEY is not set.');
  }

  // Scrub the prompt before it leaves the machine.
  const scrubbedPrompt = redactSecrets(request.prompt);
  const scrubbedSystem = redactSecrets(request.system);
  const redactions = scrubbedPrompt.redactions + scrubbedSystem.redactions;

  const limits = {
    maxOutputTokens: request.config.aiMaxOutputTokens,
    maxCostUsd: request.config.aiMaxCostUsd,
    model: request.config.anthropicModel,
  };

  const estimatedInput = estimateTokens(scrubbedSystem.text) + estimateTokens(scrubbedPrompt.text);
  const spend = checkSpendingLimit(limits, estimatedInput);
  if (!spend.allowed) {
    throw new AiRefusal(spend.reason ?? 'Refused by the spending safeguard.');
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: limits.model,
    max_tokens: limits.maxOutputTokens,
    system: scrubbedSystem.text,
    messages: [{ role: 'user', content: scrubbedPrompt.text }],
  });

  const text = message.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .trim();

  return {
    text,
    model: message.model,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    redactions,
  };
}

/**
 * The system prompt shared by every AI command.
 *
 * It states the accuracy rules explicitly, because a model that has not been
 * told about the registry will happily invent locator names — and the
 * downstream validation would then reject everything it produces.
 */
export const SYSTEM_PROMPT = [
  'You are assisting with the Springfield After Hours Toolkit, which generates mods',
  "for The Simpsons: Hit & Run using Lucas' Simpsons: Hit & Run Mod Launcher.",
  '',
  'HARD RULES — output that breaks any of these will be rejected automatically:',
  '',
  '1. NEVER invent game content. Do not invent Springfield locations, map',
  '   connections, character codes, vehicle names, locator names, file paths or',
  '   script commands. Every reference you produce is checked against a registry',
  '   of verified records, and unknown references cause your output to be discarded.',
  '2. If you do not know whether something exists, say so plainly. "I do not know',
  '   whether a locator exists for the Java Server" is a useful answer. Guessing a',
  '   name is not.',
  '3. The game is not an open-world sandbox. There is no day/night cycle, no weather',
  '   system, no dynamic NPC scheduling, no persistent world damage and no in-engine',
  '   cinematic cutscene system. Do not propose features that depend on them.',
  '4. A "night campaign" is a set of asset and lighting choices plus mission design.',
  '   It is not a simulated clock.',
  '5. The normal story format is: supported gameplay objectives, dialogue boxes,',
  '   existing character animations, and the available mission systems.',
  '',
  'When asked for structured data, return ONLY valid JSON matching the requested',
  'schema, with no commentary outside the JSON.',
].join('\n');
