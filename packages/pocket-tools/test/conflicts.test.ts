import { afterAll, describe, expect, it } from 'vitest';
import {
  PocketToolError,
  checkConflicts,
  parseIni,
  entriesIn,
  unescapeIniPath,
} from '../src/index.js';
import { caseSensitiveFs, cleanupTempDirs, makeTree } from './helpers.js';

afterAll(cleanupTempDirs);

function mod(title: string, files: Record<string, string>): string {
  return makeTree({
    'Meta.ini': `[Miscellaneous]\nTitle=${title}\nInternalName=${title.replace(/\s+/g, '')}\n`,
    ...files,
  });
}

describe('exact path conflicts', () => {
  it('reports a file supplied by two mods, and says the copies differ', () => {
    const a = mod('Mod A', { 'Resources/scripts/m0i.lua': 'version A' });
    const b = mod('Mod B', { 'Resources/scripts/m0i.lua': 'version B' });

    const report = checkConflicts([a, b]);
    expect(report.ok).toBe(false);

    const conflict = report.conflicts.find((entry) => entry.kind === 'exact-path');
    expect(conflict?.subject).toBe('Resources/scripts/m0i.lua');
    expect(conflict?.identical).toBe(false);
    expect(conflict?.participants.map((participant) => participant.mod).sort()).toEqual([
      'Mod A',
      'Mod B',
    ]);
  });

  it('says when the copies are byte-identical', () => {
    const a = mod('Mod A', { 'shared.lua': 'exactly the same' });
    const b = mod('Mod B', { 'shared.lua': 'exactly the same' });

    const conflict = checkConflicts([a, b]).conflicts.find(
      (entry) => entry.kind === 'exact-path' && entry.subject === 'shared.lua',
    );
    expect(conflict?.identical).toBe(true);
  });

  it('includes a hash per copy, for reproducibility', () => {
    const a = mod('Mod A', { 'shared.lua': 'a' });
    const b = mod('Mod B', { 'shared.lua': 'b' });

    const conflict = checkConflicts([a, b]).conflicts.find(
      (entry) => entry.subject === 'shared.lua',
    );
    for (const participant of conflict?.participants ?? []) {
      expect(participant.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('reports nothing when mods do not overlap', () => {
    const a = mod('Mod A', { 'a-only.lua': 'x' });
    const b = mod('Mod B', { 'b-only.lua': 'y' });

    const report = checkConflicts([a, b]);
    expect(report.conflicts).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('does not report each mod having its own Meta.ini as a conflict', () => {
    // Every mod has one. Reporting it would fire on every comparison and bury
    // the overlaps that actually matter.
    const a = mod('Mod A', { 'CustomFiles.ini': '[PathHandlers]\n', 'a.lua': 'x' });
    const b = mod('Mod B', { 'CustomFiles.ini': '[PathHandlers]\n', 'b.lua': 'y' });

    expect(checkConflicts([a, b]).conflicts).toEqual([]);
  });

  it('still reports a Meta.ini nested inside the mod, which is not metadata', () => {
    const a = mod('Mod A', { 'Resources/Meta.ini': 'x' });
    const b = mod('Mod B', { 'Resources/Meta.ini': 'y' });

    expect(checkConflicts([a, b]).conflicts.map((conflict) => conflict.subject)).toContain(
      'Resources/Meta.ini',
    );
  });

  it('compares three mods at once', () => {
    const a = mod('A', { 'shared.lua': '1' });
    const b = mod('B', { 'shared.lua': '2' });
    const c = mod('C', { 'shared.lua': '3' });

    const conflict = checkConflicts([a, b, c]).conflicts.find(
      (entry) => entry.subject === 'shared.lua',
    );
    expect(conflict?.participants).toHaveLength(3);
  });
});

describe('case-insensitive collisions between mods', () => {
  // Two DIFFERENT folders, so no single filesystem has to hold both spellings.
  it('reports paths that collide only when case is ignored', () => {
    const a = mod('Mod A', { 'Resources/Scripts/Main.lua': 'x' });
    const b = mod('Mod B', { 'resources/scripts/main.lua': 'y' });

    const report = checkConflicts([a, b]);
    const conflict = report.conflicts.find((entry) => entry.kind === 'case-insensitive-path');
    expect(conflict?.subject).toBe('resources/scripts/main.lua');
    expect(conflict?.participants.map((participant) => participant.where).sort()).toEqual([
      'Resources/Scripts/Main.lua',
      'resources/scripts/main.lua',
    ]);
  });

  it('does not report an exact match twice under both headings', () => {
    const a = mod('Mod A', { 'same.lua': 'x' });
    const b = mod('Mod B', { 'same.lua': 'y' });

    const report = checkConflicts([a, b]);
    expect(report.counts['exact-path']).toBe(1);
    expect(report.counts['case-insensitive-path']).toBe(0);
  });
});

describe('game paths claimed in CustomFiles.ini', () => {
  it('reports the same game path claimed by two mods', () => {
    const a = mod('Mod A', {
      'CustomFiles.ini': '[PathHandlers]\nscripts\\\\missions\\\\m0i.mfk=a.lua\n',
    });
    const b = mod('Mod B', {
      'CustomFiles.ini': '[PathHandlers]\nscripts\\\\missions\\\\m0i.mfk=b.lua\n',
    });

    const conflict = checkConflicts([a, b]).conflicts.find((entry) => entry.kind === 'game-path');
    expect(conflict?.subject).toBe('scripts/missions/m0i.mfk');
    expect(conflict?.participants).toHaveLength(2);
  });

  it('matches claims written with different slashes and casing', () => {
    const a = mod('Mod A', { 'CustomFiles.ini': '[PathHandlers]\nScripts\\\\M0I.MFK=a.lua\n' });
    const b = mod('Mod B', { 'CustomFiles.ini': '[PathRedirections]\nscripts/m0i.mfk=b.mfk\n' });

    expect(checkConflicts([a, b]).conflicts.some((entry) => entry.kind === 'game-path')).toBe(true);
  });

  it('reads the documented path-claiming sections', () => {
    const a = mod('Mod A', { 'CustomFiles.ini': '[AdditionalFiles]\nart\\\\x.p3d=a.p3d\n' });
    const b = mod('Mod B', { 'CustomFiles.ini': '[AdditionalFiles]\nart\\\\x.p3d=b.p3d\n' });

    expect(checkConflicts([a, b]).counts['game-path']).toBe(1);
  });

  it('ignores unrelated sections', () => {
    const a = mod('Mod A', { 'CustomFiles.ini': '[Miscellaneous]\nReadOnly=1\n' });
    const b = mod('Mod B', { 'CustomFiles.ini': '[Miscellaneous]\nReadOnly=1\n' });

    expect(checkConflicts([a, b]).counts['game-path']).toBe(0);
  });
});

describe('InternalName collisions', () => {
  it('reports two mods sharing an InternalName', () => {
    const a = makeTree({ 'Meta.ini': '[Miscellaneous]\nTitle=A\nInternalName=SameName\n' });
    const b = makeTree({ 'Meta.ini': '[Miscellaneous]\nTitle=B\nInternalName=samename\n' });

    const conflict = checkConflicts([a, b]).conflicts.find(
      (entry) => entry.kind === 'internal-name',
    );
    expect(conflict?.subject).toBe('samename');
  });
});

describe('input handling', () => {
  it('needs at least two folders', () => {
    expect(() => checkConflicts([makeTree({ 'a.txt': 'x' })])).toThrow(PocketToolError);
  });

  it('refuses the same folder twice', () => {
    const a = mod('Mod A', { 'a.lua': 'x' });
    expect(() => checkConflicts([a, a])).toThrow(/same folder was given twice/i);
  });

  it('notes a folder with no Meta.ini instead of failing', () => {
    const a = makeTree({ 'loose.lua': 'x' });
    const b = mod('Mod B', { 'other.lua': 'y' });

    const report = checkConflicts([a, b]);
    expect(report.mods[0]?.notes.join(' ')).toMatch(/no Meta\.ini/i);
  });

  it('falls back to the folder name when Meta.ini has no Title', () => {
    const a = makeTree({ 'Meta.ini': '[Miscellaneous]\nInternalName=x\n', 'a.lua': '1' });
    const b = mod('Mod B', { 'a.lua': '2' });

    const report = checkConflicts([a, b]);
    expect(report.mods[0]?.name).toBe(report.mods[0]?.folder);
  });

  it('keeps absolute paths out of the report', () => {
    const a = mod('Mod A', { 'shared.lua': 'x' });
    const b = mod('Mod B', { 'shared.lua': 'y' });

    const serialised = JSON.stringify(checkConflicts([a, b]));
    expect(serialised).not.toContain(a);
    expect(serialised).not.toContain(b);
  });

  it.skipIf(!caseSensitiveFs())('finds a Meta.ini whatever its casing', () => {
    const a = makeTree({ 'meta.ini': '[Miscellaneous]\nTitle=Lowercase Meta\n', 'x.lua': '1' });
    const b = mod('Mod B', { 'x.lua': '2' });

    expect(checkConflicts([a, b]).mods[0]?.name).toBe('Lowercase Meta');
  });
});

describe('the INI reader', () => {
  it('reads sections, keys and line numbers', () => {
    const ini = parseIni('; comment\n[PathHandlers]\na=1\nb=2\n');
    expect(entriesIn(ini, 'pathhandlers')).toEqual([
      { section: 'PathHandlers', key: 'a', value: '1', line: 3 },
      { section: 'PathHandlers', key: 'b', value: '2', line: 4 },
    ]);
  });

  it('keeps repeated keys, which Meta.ini relies on', () => {
    const ini = parseIni('[Miscellaneous]\nCategory=One\nCategory=Two\n');
    expect(entriesIn(ini, 'Miscellaneous').map((entry) => entry.value)).toEqual(['One', 'Two']);
  });

  it('keeps an equals sign inside a value', () => {
    const ini = parseIni('[X]\nkey=a=b\n');
    expect(entriesIn(ini, 'X')[0]?.value).toBe('a=b');
  });

  it('undoes the backslash doubling of a Custom Files key', () => {
    expect(unescapeIniPath('scripts\\\\missions\\\\m0i.mfk')).toBe('scripts\\missions\\m0i.mfk');
  });
});
