#!/usr/bin/env node
/**
 * Exercises all six pocket tools against a throwaway fixture.
 *
 * The unit tests call the library directly; this runs the actual built binary,
 * so it also covers argument parsing, exit codes and stdout/stderr separation —
 * the parts a library test cannot see.
 *
 * Written in Node rather than shell so it behaves identically on Windows.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const CLI = path.join('packages', 'cli', 'dist', 'bin.js');
const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sah-pocket-smoke-')));

const failures = [];

function sah(args, { expect = 0 } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  if (result.status !== expect) {
    failures.push(
      `sah ${args.join(' ')}\n  expected exit ${expect}, got ${result.status}\n` +
        `  stdout: ${result.stdout?.trim()}\n  stderr: ${result.stderr?.trim()}`,
    );
  }
  return result;
}

function check(label, condition) {
  if (!condition) failures.push(label);
}

function write(relative, contents) {
  const absolute = path.join(work, ...relative.split('/'));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
  return absolute;
}

// --- fixture ---------------------------------------------------------------

write('mod/Meta.ini', '[Miscellaneous]\nTitle=Smoke Test\nInternalName=SmokeTest\n');
write('mod/CustomFiles.ini', '[PathHandlers]\nscripts\\\\m0i.mfk=Resources/scripts/m0i.lua\n');
write('mod/Resources/scripts/m0i.lua', 'Game.SelectMission("m0")\n');
write('mod/README.txt', 'See Resources/Scripts/M0I.lua for the mission.\n');
write('mod/.DS_Store', 'finder junk');
write('mod/Resources/._m0i.lua', 'apple double');

write('other/Meta.ini', '[Miscellaneous]\nTitle=Other Mod\nInternalName=SmokeTest\n');
write('other/Resources/scripts/m0i.lua', 'Game.SelectMission("m1")\n');

const mod = path.join(work, 'mod');
const other = path.join(work, 'other');

// --- 1. case-check ---------------------------------------------------------

const caseCheck = sah(['pocket', 'case-check', mod], { expect: 1 });
check(
  'case-check finds the mis-cased reference',
  caseCheck.stdout.includes('Resources/scripts/m0i.lua'),
);
check(
  'case-check does not flag ordinary prose',
  !caseCheck.stdout.includes('mission.') && !caseCheck.stdout.includes('See '),
);

// --- 2. clean-export -------------------------------------------------------

const exported = path.join(work, 'export');
sah(['pocket', 'clean-export', mod, exported]);
check('clean-export kept the source junk', fs.existsSync(path.join(mod, '.DS_Store')));
check('clean-export dropped .DS_Store', !fs.existsSync(path.join(exported, '.DS_Store')));
check(
  'clean-export dropped AppleDouble',
  !fs.existsSync(path.join(exported, 'Resources', '._m0i.lua')),
);
check('clean-export copied real files', fs.existsSync(path.join(exported, 'Meta.ini')));

// Deleting from the original must refuse without confirmation.
sah(['pocket', 'clean-export', mod, '--in-place'], { expect: 2 });
check('refused in-place left the junk alone', fs.existsSync(path.join(mod, '.DS_Store')));

// --- 3. conflicts ----------------------------------------------------------

const conflicts = sah(['pocket', 'conflicts', mod, other], { expect: 1 });
check(
  'conflicts calls them potential',
  conflicts.stdout.toLowerCase().includes('potential file conflicts'),
);
check('conflicts finds the shared script', conflicts.stdout.includes('Resources/scripts/m0i.lua'));

// --- 4. manifest -----------------------------------------------------------

const first = sah(['pocket', 'manifest', exported]);
const second = sah(['pocket', 'manifest', exported]);
check('manifest is byte-identical across runs', first.stdout === second.stdout);
check('manifest carries no timestamp', !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(first.stdout));
check('manifest leaks no absolute path', !first.stdout.includes(work));

// Written into the folder it describes, it must still not describe itself.
const inside = path.join(exported, 'manifest.json');
sah(['pocket', 'manifest', exported, '--output', inside]);
const firstBytes = fs.readFileSync(inside, 'utf8');
sah(['pocket', 'manifest', exported, '--output', inside]);
check('manifest excludes itself', fs.readFileSync(inside, 'utf8') === firstBytes);

// --- 5. diff ---------------------------------------------------------------

sah(['pocket', 'diff', exported, exported]);
write('export2/Meta.ini', '[Miscellaneous]\nTitle=Smoke Test\nInternalName=SmokeTest\n');
const diff = sah(['pocket', 'diff', exported, path.join(work, 'export2')], { expect: 1 });
check('diff reports removals', diff.stdout.includes('- '));

// --- 6. path ---------------------------------------------------------------

const forms = sah(['pocket', 'path', mod, 'Resources/scripts/m0i.lua']);
check('path emits the windows form', forms.stdout.includes('Resources\\scripts\\m0i.lua'));
check('path emits the ini form', forms.stdout.includes('Resources\\\\scripts\\\\m0i.lua'));
check('path leaks no absolute path', !forms.stdout.includes(work));

const single = sah(['pocket', 'path', mod, 'Resources/scripts/m0i.lua', '--form', 'posix']);
check(
  'path --form prints only the path on stdout',
  single.stdout === 'Resources/scripts/m0i.lua\n',
);

// Anything outside the project is refused.
sah(['pocket', 'path', mod, path.join(other, 'Meta.ini')], { expect: 2 });
sah(['pocket', 'path', mod, '../../../../etc/passwd'], { expect: 2 });

// --- report ----------------------------------------------------------------

fs.rmSync(work, { recursive: true, force: true });

if (failures.length > 0) {
  process.stdout.write(`\n${failures.length} pocket tool check(s) failed:\n\n`);
  for (const failure of failures) process.stdout.write(`  ${failure}\n`);
  process.exit(1);
}

process.stdout.write('All six pocket tools behaved correctly.\n');
