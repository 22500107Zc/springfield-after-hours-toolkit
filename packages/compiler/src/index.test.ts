import { describe, expect, it } from 'vitest';
import { Registry } from '@sah/registry';
import type { Campaign } from '@sah/schemas';
import { previewBuild } from './index.js';

const registry = new Registry([
  {
    id: 'noop',
    kind: 'objective',
    displayName: 'No-op',
    aliases: [],
    tags: [],
    provenance: {
      sourceType: 'toolkit-fixture',
      sourceReference: 'test',
      verificationStatus: 'experimental',
      confidence: 1,
    },
  },
]);
const campaign: Campaign = {
  campaign: { id: 'test', title: 'Test', version: '0.1.0' },
  missions: [{ id: 'm1', stages: [{ id: 's1', objective: { type: 'noop', note: 'test' } }] }],
  dialogue: [],
};
describe('previewBuild', () => {
  it('is deterministic', () =>
    expect(previewBuild(campaign, registry).files).toEqual(previewBuild(campaign, registry).files));
});
