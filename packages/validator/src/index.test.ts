import { describe, expect, it } from 'vitest';
import { Registry } from '@sah/registry';
import { validateCampaign } from './index.js';

const provenance = {
  sourceType: 'toolkit-fixture' as const,
  sourceReference: 'test',
  verificationStatus: 'experimental' as const,
  confidence: 1,
};
const registry = new Registry([
  { id: 'noop', kind: 'objective', displayName: 'No-op', aliases: [], tags: [], provenance },
  {
    id: 'fixture-player',
    kind: 'character',
    displayName: 'Fixture',
    aliases: [],
    tags: [],
    provenance,
  },
]);
const campaign = {
  campaign: { id: 'test', title: 'Test', version: '0.1.0' },
  missions: [
    {
      id: 'm1',
      player: 'fixture-player',
      stages: [{ id: 's1', objective: { type: 'noop', note: 'test' } }],
    },
  ],
  dialogue: [],
};

describe('validateCampaign', () => {
  it('accepts a provenance-backed fixture', () =>
    expect(validateCampaign(campaign, registry).valid).toBe(true));
  it('rejects unknown references', () =>
    expect(
      validateCampaign(
        { ...campaign, missions: [{ ...campaign.missions[0], player: 'invented' }] },
        registry,
      ).diagnostics[0]?.code,
    ).toBe('UNKNOWN_CHARACTER'));
});
