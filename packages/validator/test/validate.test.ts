import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DIAGNOSTIC_CODES } from '@sah/core';
import { loadRegistries } from '@sah/registry';
import { loadProject, projectLoaded, validateProject } from '../src/index.js';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const registries = loadRegistries();

function validate(fixture: string): ReturnType<typeof validateProject> {
  const project = loadProject(path.join(repoRoot, fixture));
  return validateProject(project, registries);
}

function errorCodes(fixture: string): string[] {
  return [
    ...new Set(
      validate(fixture)
        .diagnostics.filter((d) => d.severity === 'error')
        .map((d) => d.code),
    ),
  ].sort();
}

describe('valid campaigns', () => {
  it('accepts the minimal campaign with no errors', () => {
    const result = validate('examples/minimal-campaign');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('invalid campaigns', () => {
  it('rejects duplicate mission ids', () => {
    expect(errorCodes('fixtures/invalid/duplicate-ids')).toContain(DIAGNOSTIC_CODES.DUPLICATE_ID);
  });

  it('rejects references to unverified game content', () => {
    const codes = errorCodes('fixtures/invalid/unresolved-references');
    expect(codes).toContain(DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR);
    expect(codes).toContain(DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE);
    expect(codes).toContain(DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER);
  });

  it('refuses an objective whose parameters are undocumented upstream', () => {
    expect(errorCodes('fixtures/invalid/unsupported-objective')).toContain(
      DIAGNOSTIC_CODES.UNSUPPORTED_OBJECTIVE,
    );
  });

  it('refuses a path that escapes the campaign directory', () => {
    expect(errorCodes('fixtures/invalid/unsafe-path')).toContain(
      DIAGNOSTIC_CODES.UNSAFE_OUTPUT_PATH,
    );
  });

  it('refuses raw commands without an explicit opt-in', () => {
    expect(errorCodes('fixtures/invalid/raw-not-opted-in')).toContain(
      DIAGNOSTIC_CODES.RAW_LUA_NOT_OPTED_IN,
    );
  });

  it('rejects a command called with the wrong number of arguments', () => {
    // Arity comes from Game.lua's own command table, so this catches a script
    // that would raise a Lua error at runtime.
    expect(errorCodes('fixtures/invalid/command-arity')).toContain(DIAGNOSTIC_CODES.COMMAND_ARITY);
  });

  it('reports a schema error for a malformed campaign document', () => {
    const project = loadProject(path.join(repoRoot, 'fixtures/invalid/bad-schema'));
    expect(projectLoaded(project)).toBe(false);
    expect(project.diagnostics.map((d) => d.code)).toContain(DIAGNOSTIC_CODES.SCHEMA_INVALID);
    // The file exists; it is invalid, not missing.
    expect(project.campaignFile).not.toBe('');
  });
});

describe('the Springfield After Hours example', () => {
  // This example is expected to FAIL. It is the demonstration of the toolkit's
  // central behaviour, so a change that makes it pass is a regression worth
  // failing the build over.
  const result = validate('examples/springfield-after-hours');

  it('does not validate, because its geography is unverified', () => {
    expect(result.ok).toBe(false);
  });

  it('reports unresolved locators and an unresolved vehicle', () => {
    const codes = result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes).toContain(DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR);
    expect(codes).toContain(DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE);
  });

  it('resolves its characters, because those are documented', () => {
    // The asymmetry is the point: identity is documented, geography is not.
    const characterErrors = result.diagnostics.filter(
      (d) =>
        d.code === DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER ||
        d.code === DIAGNOSTIC_CODES.UNRESOLVED_SPEAKER,
    );
    expect(characterErrors).toEqual([]);
  });

  it('treats missing dialogue audio as a note, not an error', () => {
    const audio = result.diagnostics.filter(
      (d) => d.code === DIAGNOSTIC_CODES.DIALOGUE_MISSING_AUDIO,
    );
    expect(audio.length).toBeGreaterThan(0);
    expect(audio.every((d) => d.severity === 'info')).toBe(true);
  });
});

describe('verification gating', () => {
  // Loaded from a test-only directory so the real registries stay free of
  // invented data. This also exercises the extra-registry-directory mechanism.
  const testRegistries = loadRegistries({
    dataDirectories: [path.join(repoRoot, 'fixtures/test-data')],
  });

  function missionReferencing(locator: unknown): ReturnType<typeof validateProject> {
    const project = loadProject(path.join(repoRoot, 'examples/minimal-campaign'));
    if (!projectLoaded(project)) throw new Error('fixture failed to load');
    project.missions[0]!.mission.resetPlayerInCarLocator = locator as never;
    return validateProject(project, testRegistries);
  }

  it('refuses an unverified reference by default', () => {
    const result = missionReferencing('test-unverified-locator');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain(
      DIAGNOSTIC_CODES.REFERENCE_NOT_BUILDABLE,
    );
  });

  it('allows an unverified reference with an explicit opt-in, and records the risk', () => {
    const result = missionReferencing({
      ref: 'test-unverified-locator',
      allowUnverified: true,
      reason: 'exercising the documented override path',
    });

    expect(result.ok).toBe(true);
    expect(result.acceptedRisks).toHaveLength(1);
    expect(result.acceptedRisks[0]).toMatchObject({
      reference: 'test-unverified-locator',
      registry: 'locators',
      status: 'unverified',
      reason: 'exercising the documented override path',
    });
    // The override must be loud, not silent.
    expect(result.diagnostics.map((d) => d.code)).toContain(
      DIAGNOSTIC_CODES.UNVERIFIED_OVERRIDE_USED,
    );
  });

  it('builds an experimental reference but warns about it', () => {
    const result = missionReferencing('test-experimental-locator');
    expect(result.ok).toBe(true);
    const warning = result.diagnostics.find(
      (d) => d.code === DIAGNOSTIC_CODES.EXPERIMENTAL_REFERENCE,
    );
    expect(warning?.severity).toBe('warning');
  });
});

describe('validation determinism', () => {
  it('produces identical diagnostics across repeated runs', () => {
    const first = validate('examples/springfield-after-hours').diagnostics;
    const second = validate('examples/springfield-after-hours').diagnostics;
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
