import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_HELP,
  DiagnosticBag,
  ProvenanceIndex,
  isBuildable,
  loadConfig,
  normaliseText,
  redactConfig,
  sha256,
  stableStringify,
  hasAnthropicApiKey,
} from '../src/index.js';

describe('verification statuses', () => {
  it('only allows verified and experimental records to build', () => {
    expect(isBuildable('verified')).toBe(true);
    expect(isBuildable('experimental')).toBe(true);
    // An unverified record is a name with unknown semantics — exactly the thing
    // that produces a mod which silently does nothing.
    expect(isBuildable('unverified')).toBe(false);
    expect(isBuildable('community-reported')).toBe(false);
    expect(isBuildable('unsupported')).toBe(false);
    expect(isBuildable('planned')).toBe(false);
  });
});

describe('stableStringify', () => {
  it('produces identical output regardless of key insertion order', () => {
    const a = { b: 1, a: { d: 2, c: 3 } };
    const b = { a: { c: 3, d: 2 }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('drops undefined values so they cannot vary between runs', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe('normaliseText', () => {
  it('normalises to LF with exactly one trailing newline', () => {
    expect(normaliseText('a\r\nb\r\n\r\n')).toBe('a\nb\n');
    expect(normaliseText('a')).toBe('a\n');
  });
});

describe('sha256', () => {
  it('is stable for the same input', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('hello')).not.toBe(sha256('world'));
  });
});

describe('DiagnosticBag', () => {
  it('sorts deterministically so reports are reproducible', () => {
    const bag = new DiagnosticBag();
    bag.warn(DIAGNOSTIC_CODES.EXPERIMENTAL_REFERENCE, 'warn b', { location: { file: 'b.yaml' } });
    bag.error(DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR, 'error z', { location: { file: 'z.yaml' } });
    bag.error(DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR, 'error a', { location: { file: 'a.yaml' } });

    const sorted = bag.sorted();
    expect(sorted.map((d) => d.message)).toEqual(['error a', 'error z', 'warn b']);
    expect(bag.hasErrors).toBe(true);
    expect(bag.summary()).toEqual({ errors: 2, warnings: 1, infos: 0 });
  });
});

describe('ProvenanceIndex', () => {
  const index = new ProvenanceIndex([
    {
      id: 'docs',
      type: 'official-documentation',
      title: 'Some Docs',
      url: 'https://example.invalid/docs',
    },
    {
      id: 'repo',
      type: 'official-repository',
      title: 'someorg/somerepo',
      commit: 'abcdef0123456789',
      path: 'src/Thing.lua',
    },
  ]);

  it('reports unknown source ids rather than silently ignoring them', () => {
    const { resolved, missing } = index.resolve({ sources: ['docs', 'nope'] });
    expect(resolved.map((s) => s.id)).toEqual(['docs']);
    expect(missing).toEqual(['nope']);
  });

  it('cites documentation and repositories differently', () => {
    expect(ProvenanceIndex.cite(index.get('docs')!)).toContain('https://example.invalid/docs');
    const repoCitation = ProvenanceIndex.cite(index.get('repo')!);
    expect(repoCitation).toContain('src/Thing.lua');
    expect(repoCitation).toContain('abcdef012345');
  });
});

describe('configuration', () => {
  it('applies precedence with later layers winning', () => {
    const { config } = loadConfig({
      env: { SAH_ANTHROPIC_MODEL: 'from-env' },
      overrides: { anthropicModel: 'from-cli' },
      homedir: '/nonexistent-home',
    });
    expect(config.anthropicModel).toBe('from-cli');
  });

  it('reads environment values when no override is given', () => {
    const { config } = loadConfig({
      env: { SAH_GAME_PATH: '/games/shar' },
      homedir: '/nonexistent-home',
    });
    expect(config.gamePath).toBe('/games/shar');
  });

  it('never contains an api key field', () => {
    const { config } = loadConfig({
      env: { ANTHROPIC_API_KEY: 'sk-ant-secret' },
      homedir: '/nonexistent-home',
    });
    const serialised = JSON.stringify(redactConfig(config));
    expect(serialised).not.toContain('sk-ant-secret');
    expect(serialised).not.toContain('apiKey');
  });
});

describe('hasAnthropicApiKey', () => {
  it('reports presence without exposing the value', () => {
    expect(hasAnthropicApiKey({ ANTHROPIC_API_KEY: 'sk-ant-x' })).toBe(true);
    expect(hasAnthropicApiKey({ ANTHROPIC_API_KEY: '  ' })).toBe(false);
    expect(hasAnthropicApiKey({})).toBe(false);
  });
});

describe('diagnostic help', () => {
  it('explains every code the toolkit can emit', () => {
    // A diagnostic the user cannot get an explanation for is a dead end, so
    // this test fails whenever a code is added without help text.
    const codes = Object.values(DIAGNOSTIC_CODES);
    const missing = codes.filter((code) => !DIAGNOSTIC_HELP[code]);
    expect(missing).toEqual([]);
  });

  it('gives every explanation at least one concrete fix', () => {
    for (const [code, help] of Object.entries(DIAGNOSTIC_HELP)) {
      expect(help.fixes.length, `${code} has no suggested fixes`).toBeGreaterThan(0);
    }
  });
});
