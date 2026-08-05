import { describe, expect, it } from 'vitest';
import { MissionSchema } from '@sah/schemas';
import { loadRegistries } from '@sah/registry';
import {
  checkAiAvailability,
  checkProposedMissionReferences,
  checkSpendingLimit,
  extractJson,
  isSendable,
  parseProposal,
  redactSecrets,
} from '../src/index.js';

const registries = loadRegistries();

describe('availability', () => {
  it('is unavailable without a key, and says why', () => {
    const result = checkAiAvailability({});
    expect(result.available).toBe(false);
    expect(result.hasApiKey).toBe(false);
    expect(result.reason).toMatch(/optional/i);
  });

  it('is available with a key', () => {
    expect(checkAiAvailability({ ANTHROPIC_API_KEY: 'sk-ant-test' }).available).toBe(true);
  });
});

describe('spending safeguard', () => {
  const limits = { maxOutputTokens: 4096, maxCostUsd: 0.5, model: 'claude-sonnet-5' };

  it('allows a small request', () => {
    expect(checkSpendingLimit(limits, 1000).allowed).toBe(true);
  });

  it('refuses a request whose worst case exceeds the limit', () => {
    const result = checkSpendingLimit({ ...limits, maxCostUsd: 0.0001 }, 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/exceeds the configured limit/);
  });
});

describe('secret redaction', () => {
  it('scrubs credentials before anything leaves the machine', () => {
    // Assembled at runtime so this file contains no credential-shaped literal
    // for the repository's secret scanner to trip over.
    const cases = [
      `sk-ant-${'api03'}-abcdefghijklmnop`,
      `ghp${'_'}abcdefghijklmnopqrstuvwxyz012345`,
      `AKIA${'IOSFODNN7EXAMPLE'}`,
    ];
    for (const secret of cases) {
      const result = redactSecrets(`my key is ${secret} ok`);
      expect(result.text, secret).not.toContain(secret);
      expect(result.redactions).toBeGreaterThan(0);
    }
  });

  it('leaves ordinary campaign text alone', () => {
    const text = 'mission: garage-search\nspeaker: cbg\n';
    expect(redactSecrets(text)).toEqual({ text, redactions: 0 });
  });
});

describe('binary asset guard', () => {
  it('refuses to send game and media files', () => {
    for (const file of ['art/cars/famil_v.p3d', 'audio/line.wav', 'movie.bik', 'mod.zip']) {
      expect(isSendable(file), file).toBe(false);
    }
  });

  it('allows text campaign sources', () => {
    for (const file of ['campaign.yaml', 'missions/first.yaml', 'notes.md']) {
      expect(isSendable(file), file).toBe(true);
    }
  });
});

describe('proposal parsing', () => {
  it('extracts JSON from a fenced code block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('  {"a":1}  ')).toEqual({ a: 1 });
  });

  it('rejects output that is not JSON', () => {
    const result = parseProposal('I think you should make a mission about...', MissionSchema);
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.rejection.stage).toBe('parse');
  });

  it('rejects JSON that does not match the schema', () => {
    const result = parseProposal('{"id":"x"}', MissionSchema);
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.rejection.stage).toBe('parse');
      expect(result.rejection.details.length).toBeGreaterThan(0);
    }
  });

  it('accepts a well-formed mission', () => {
    const proposal = JSON.stringify({
      id: 'a-mission',
      title: 'A Mission',
      gameMissionName: 'm0',
      level: 'level01',
      stages: [{ id: 'stage-one', objective: { type: 'dummy' } }],
    });
    const result = parseProposal(proposal, MissionSchema);
    expect(result.accepted).toBe(true);
  });
});

describe('reference checking of proposals', () => {
  const baseMission = {
    id: 'a-mission',
    title: 'A Mission',
    gameMissionName: 'm0',
    level: 'level01',
    stages: [{ id: 'stage-one', objective: { type: 'dummy' } }],
  };

  it('accepts a proposal that only references verified content', () => {
    const mission = MissionSchema.parse(baseMission);
    const result = checkProposedMissionReferences(mission, registries);
    expect(result.accepted).toBe(true);
  });

  it('rejects a proposal that invents a locator', () => {
    // This is the failure mode the whole pipeline exists to prevent: a
    // plausible-sounding locator name that does not exist.
    const mission = MissionSchema.parse({
      ...baseMission,
      resetPlayerInCarLocator: 'java-server-front-door',
    });
    const result = checkProposedMissionReferences(mission, registries);
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.rejection.stage).toBe('references');
      expect(result.rejection.details.join(' ')).toContain('java-server-front-door');
      expect(result.rejection.message).toMatch(/nothing was written/i);
    }
  });

  it('rejects a proposal that invents a vehicle', () => {
    const mission = MissionSchema.parse({ ...baseMission, startingVehicle: 'honor-roller' });
    const result = checkProposedMissionReferences(mission, registries);
    expect(result.accepted).toBe(false);
  });

  it('rejects a proposal using a command that does not exist', () => {
    const mission = MissionSchema.parse({
      ...baseMission,
      allowRawGameCommands: true,
      stages: [
        {
          id: 'stage-one',
          objective: { type: 'dummy' },
          rawCommands: [{ command: 'SetNightTime', args: [1] }],
        },
      ],
    });
    const result = checkProposedMissionReferences(mission, registries);
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.rejection.details.join(' ')).toContain('SetNightTime');
    }
  });
});
