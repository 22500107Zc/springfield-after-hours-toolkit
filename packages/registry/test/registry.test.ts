import { describe, expect, it } from 'vitest';
import { REGISTRY_KINDS } from '@sah/schemas';
import {
  listRecords,
  loadRegistries,
  registryCounts,
  resolveRecord,
  searchRegistries,
} from '../src/index.js';

const registries = loadRegistries();

describe('registry loading', () => {
  it('loads every registry file without errors', () => {
    const errors = registries.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((e) => `${e.code}: ${e.message}`)).toEqual([]);
  });

  it('declares a file for every registry kind', () => {
    // A missing registry file would make references to that kind fail with a
    // confusing "unknown registry" rather than an honest "nothing verified".
    const counts = registryCounts(registries);
    for (const kind of REGISTRY_KINDS) {
      expect(Object.keys(counts), `no registry file declares kind "${kind}"`).toContain(kind);
    }
  });

  it('gives every record a provenance source that exists', () => {
    for (const kind of REGISTRY_KINDS) {
      for (const record of listRecords(registries, kind)) {
        const { missing } = registries.provenance.resolve(record.provenance);
        expect(missing, `${kind}:${record.id} cites unknown sources`).toEqual([]);
        expect(record.provenance.sources.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('registries that are intentionally empty', () => {
  // These are load-bearing: the Springfield After Hours example depends on
  // these being empty in order to demonstrate unresolved-reference diagnostics.
  // If someone populates one by guessing, this test is the tripwire.
  it.each(['locations', 'vehicles', 'maps', 'interiors', 'assets'] as const)(
    'the %s registry contains only records with real provenance',
    (kind) => {
      for (const record of listRecords(registries, kind)) {
        expect(
          record.provenance.sources,
          `${kind}:${record.id} was added without a provenance source`,
        ).not.toHaveLength(0);
      }
    },
  );

  it('has no verified location record, so location references still fail', () => {
    const locations = listRecords(registries, 'locations');
    expect(locations.filter((r) => r.verificationStatus === 'verified')).toEqual([]);
  });
});

describe('derived command registry', () => {
  it('carries the scope and arity rules taken from Game.lua', () => {
    const addStage = resolveRecord(registries, 'commands', 'add-stage').record;
    expect(addStage).toBeDefined();
    expect(addStage?.['requiresScope']).toBe('Mission');
    expect(addStage?.['opensScope']).toBe('Stage');
    expect(addStage?.['minArgs']).toBe(0);
    expect(addStage?.['maxArgs']).toBe(7);

    const addObjective = resolveRecord(registries, 'commands', 'add-objective').record;
    expect(addObjective?.['requiresScope']).toBe('Stage');
    expect(addObjective?.['opensScope']).toBe('Objective');

    const closeMission = resolveRecord(registries, 'commands', 'close-mission').record;
    expect(closeMission?.['closesScope']).toBe('Mission');
  });

  it('marks conditional commands and the hack that provides them', () => {
    const conditional = resolveRecord(registries, 'commands', 'if-current-checkpoint').record;
    expect(conditional?.['conditional']).toBe(true);
    expect(conditional?.['providedByHack']).toBe('AdditionalScriptFunctionality');
  });
});

describe('character registry', () => {
  it('has the dialogue codes published by Donut Team', () => {
    const cases: Array<[string, string]> = [
      ['bart', 'Brt'],
      ['cbg', 'Cbg'],
      ['snake', 'Snk'],
      ['wiggum', 'Wig'],
      ['milhouse', 'Mil'],
      ['nelson', 'Nel'],
    ];
    for (const [id, code] of cases) {
      const record = resolveRecord(registries, 'characters', id).record;
      expect(record, `character "${id}" is missing`).toBeDefined();
      expect(record?.['dialogueCode']).toBe(code);
      expect(record?.verificationStatus).toBe('verified');
    }
  });

  it('resolves a character by its game code as well as its id', () => {
    const byAlias = resolveRecord(registries, 'characters', 'Cbg');
    expect(byAlias.record?.id).toBe('cbg');
    expect(byAlias.viaAlias).toBe(true);
  });
});

describe('search', () => {
  it('finds a verified record by display name', () => {
    const hits = searchRegistries(registries, 'Comic Book Guy', { kind: 'characters' });
    expect(hits[0]?.record.id).toBe('cbg');
  });

  it('returns nothing for content the toolkit cannot verify', () => {
    // These two searches returning empty is the whole thesis of the project.
    expect(searchRegistries(registries, 'Java Server', { kind: 'locations' })).toEqual([]);
    expect(searchRegistries(registries, 'Honor Roller', { kind: 'vehicles' })).toEqual([]);
  });

  it('ranks exact id matches above substring matches', () => {
    const hits = searchRegistries(registries, 'dummy', { kind: 'objectives' });
    expect(hits[0]?.record.id).toBe('dummy');
    expect(hits[0]?.matchedOn).toBe('id');
  });

  it('is deterministic across repeated calls', () => {
    const first = searchRegistries(registries, 'stage').map((h) => h.record.id);
    const second = searchRegistries(registries, 'stage').map((h) => h.record.id);
    expect(first).toEqual(second);
  });
});
