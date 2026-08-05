import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadRegistries } from '@sah/registry';
import { loadProject, projectLoaded, type LoadedCampaignProject } from '@sah/validator';
import { buildCampaign } from '../src/index.js';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const registries = loadRegistries();
const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-build-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

function loadFixture(fixture: string): LoadedCampaignProject {
  const project = loadProject(path.join(repoRoot, fixture));
  if (!projectLoaded(project)) {
    throw new Error(`fixture ${fixture} failed to load: ${JSON.stringify(project.diagnostics)}`);
  }
  return project;
}

function buildMinimal(outputDirectory: string, dryRun = true): ReturnType<typeof buildCampaign> {
  return buildCampaign(loadFixture('examples/minimal-campaign'), registries, {
    outputDirectory,
    dryRun,
    toolkitVersion: '0.1.0',
  });
}

describe('building the minimal campaign', () => {
  it('succeeds and generates the expected file set', () => {
    const result = buildMinimal(temporaryDirectory());
    expect(result.ok).toBe(true);
    expect(result.files.map((f) => f.path).sort()).toEqual([
      'CustomFiles.ini',
      'CustomFiles.lua',
      'Meta.ini',
      'README.generated.md',
      'Resources/scripts/missions/level01/m0i.lua',
      'build-manifest.json',
    ]);
  });

  it('writes nothing at all during a dry run', () => {
    const directory = temporaryDirectory();
    fs.rmSync(directory, { recursive: true, force: true });
    const result = buildMinimal(directory, true);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(directory)).toBe(false);
  });

  it('writes files when not a dry run', () => {
    const directory = temporaryDirectory();
    buildMinimal(directory, false);
    expect(fs.existsSync(path.join(directory, 'Meta.ini'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'Resources/scripts/missions/level01/m0i.lua'))).toBe(
      true,
    );
  });

  it('produces byte-identical output on repeated builds', () => {
    // Determinism is a stated requirement, so it gets a test rather than a
    // comment promising it.
    const first = buildMinimal(temporaryDirectory());
    const second = buildMinimal(temporaryDirectory());

    const serialise = (result: ReturnType<typeof buildCampaign>): string =>
      result.files
        .map((f) => `${f.path}\n${f.contents}`)
        .sort()
        .join('\n---\n');

    expect(serialise(first)).toBe(serialise(second));
  });

  it('omits a timestamp from the manifest by default', () => {
    const result = buildMinimal(temporaryDirectory());
    expect(result.manifest?.generatedAt).toBeUndefined();
  });

  it('includes a timestamp only when explicitly requested', () => {
    const result = buildCampaign(loadFixture('examples/minimal-campaign'), registries, {
      outputDirectory: temporaryDirectory(),
      dryRun: true,
      toolkitVersion: '0.1.0',
      includeTimestamp: true,
    });
    expect(result.manifest?.generatedAt).toBeTypeOf('string');
  });
});

describe('generated Meta.ini', () => {
  const result = buildMinimal(temporaryDirectory());
  const metaIni = result.files.find((f) => f.path === 'Meta.ini')?.contents ?? '';

  it('contains the [Miscellaneous] section the Mod Launcher requires', () => {
    expect(metaIni).toContain('[Miscellaneous]');
  });

  it('sets Title and InternalName, which the documentation strongly recommends', () => {
    expect(metaIni).toContain('Title=Minimal Campaign');
    expect(metaIni).toContain('InternalName=MinimalCampaign');
  });

  it('always requires the Custom Files hack, which delivers the scripts', () => {
    expect(metaIni).toContain('RequiredHack=CustomFiles');
  });

  it('writes booleans as the 0/1 the format uses', () => {
    expect(metaIni).toContain('Main=1');
    expect(metaIni).toContain('SupportsDemo=0');
  });
});

describe('generated CustomFiles.ini', () => {
  const result = buildMinimal(temporaryDirectory());
  const customFiles = result.files.find((f) => f.path === 'CustomFiles.ini')?.contents ?? '';

  it('declares a path handler mapping the game MFK to generated Lua', () => {
    expect(customFiles).toContain('[PathHandlers]');
    // Donut Team's own examples write these keys with doubled backslashes.
    expect(customFiles).toContain(
      'scripts\\\\missions\\\\level01\\\\m0i.mfk=Resources/scripts/missions/level01/m0i.lua',
    );
  });
});

describe('generated CustomFiles.lua', () => {
  const result = buildMinimal(temporaryDirectory());
  const lua = result.files.find((f) => f.path === 'CustomFiles.lua')?.contents ?? '';

  it('loads Game.lua using the documented dofile form', () => {
    expect(lua).toContain('dofile(GetModPath() .. "/Resources/lib/Game.lua")');
  });

  it('attributes Game.lua to Donut Team', () => {
    expect(lua).toContain('Donut Team');
  });
});

describe('generated mission script', () => {
  const result = buildMinimal(temporaryDirectory());
  const lua =
    result.files.find((f) => f.path === 'Resources/scripts/missions/level01/m0i.lua')?.contents ??
    '';

  it('opens and closes every scope', () => {
    expect(lua).toContain('Game.SelectMission("m0")');
    expect(lua).toContain('Game.AddStage()');
    expect(lua).toContain('Game.AddObjective("dummy")');
    expect(lua).toContain('Game.CloseObjective()');
    expect(lua).toContain('Game.CloseStage()');
    expect(lua).toContain('Game.CloseMission()');
  });

  it('writes the game code for a reference, not the registry id', () => {
    // The registry id is "level1-carstart"; the game knows "level1_carstart".
    expect(lua).toContain('Game.SetMissionResetPlayerInCar("level1_carstart")');
    expect(lua).not.toContain('level1-carstart');
  });
});

describe('build manifest', () => {
  const result = buildMinimal(temporaryDirectory());
  const manifest = result.manifest!;

  it('hashes every generated file', () => {
    for (const file of manifest.files) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
    }
  });

  it('records the registry records the output depended on', () => {
    const ids = manifest.provenance.records.map((r) => `${r.registry}:${r.id}`);
    expect(ids).toContain('objectives:dummy');
    expect(ids).toContain('locators:level1-carstart');
  });

  it('cites the sources behind those records', () => {
    const sourceIds = manifest.provenance.sources.map((s) => s.id);
    expect(sourceIds).toContain('donutteam-game-lua-readme');
  });

  it('pins the upstream Game.lua commit', () => {
    expect(manifest.upstream.gameLua.repository).toBe('donutteam/game-lua');
    expect(manifest.upstream.gameLua.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.upstream.gameLua.license).toBe('MIT');
  });

  it('states plainly what a successful build does not prove', () => {
    expect(manifest.disclaimer.join(' ')).toMatch(/does NOT mean/i);
  });
});

describe('refusing to build', () => {
  it('refuses when validation fails, and writes nothing', () => {
    const directory = temporaryDirectory();
    fs.rmSync(directory, { recursive: true, force: true });

    const result = buildCampaign(
      loadFixture('fixtures/invalid/unresolved-references'),
      registries,
      { outputDirectory: directory, dryRun: false, toolkitVersion: '0.1.0' },
    );

    expect(result.ok).toBe(false);
    expect(result.manifest).toBeUndefined();
    expect(fs.existsSync(directory)).toBe(false);
  });

  it('refuses the Springfield After Hours example', () => {
    const result = buildCampaign(loadFixture('examples/springfield-after-hours'), registries, {
      outputDirectory: temporaryDirectory(),
      dryRun: true,
      toolkitVersion: '0.1.0',
    });
    expect(result.ok).toBe(false);
  });
});
