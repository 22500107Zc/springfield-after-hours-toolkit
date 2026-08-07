#!/usr/bin/env node
/**
 * Step 3: wrap each executable in an archive a beginner can actually use.
 *
 * The executable alone is not a usable download. Someone who unzips a folder
 * containing one mysterious file, on a Mac that then refuses to open it, is
 * stuck. So every archive also carries a Start Here file for that platform, a
 * beginner README, the licences, and the editor definitions.
 *
 * Two things are handled carefully because they are the usual ways this breaks:
 *
 * - **The executable bit.** Lost, and macOS and Linux users get "permission
 *   denied". `zip` does not always preserve it; `tar` does. macOS and Linux
 *   therefore get `.tar.gz`, Windows gets `.zip` (which does not have the
 *   concept and where `.tar.gz` is the awkward one).
 * - **Build-machine paths.** A binary or text file carrying `/home/runner/...`
 *   leaks the build environment. Checked for explicitly, not assumed absent.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TARGETS } from './build-binaries.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const bundleDir = path.join(repoRoot, 'dist-bundle');
const binariesDir = path.join(bundleDir, 'binaries');
const stageRoot = path.join(bundleDir, 'stage');
const outDir = path.join(bundleDir, 'archives');

const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;

/** Files every archive carries, whatever the platform. */
function commonFiles() {
  return [
    { from: path.join(repoRoot, 'LICENSE'), to: 'LICENSE' },
    { from: path.join(repoRoot, 'THIRD_PARTY_NOTICES.md'), to: 'THIRD_PARTY_NOTICES.md' },
    {
      from: path.join(repoRoot, 'packages', 'game-lua-definitions', 'generated', 'Game.meta.lua'),
      to: path.join('editor-definitions', 'Game.meta.lua'),
    },
    {
      from: path.join(repoRoot, 'docs', 'releases', 'artifacts', 'Game.meta.lua.README.md'),
      to: path.join('editor-definitions', 'README.md'),
    },
  ];
}

function beginnerReadme(target) {
  const mac = target.os === 'darwin';
  const win = target.os === 'win32';
  const runLine = win ? 'sah.exe' : './sah';

  return `${[
    '# Springfield After Hours Toolkit',
    '',
    `Version ${version} — ${target.id}`,
    '',
    'Tools for making and preparing mods for The Simpsons: Hit & Run.',
    '',
    '**You do not need Node, npm, Git, or anything else installed.** Everything',
    'is in this folder.',
    '',
    '---',
    '',
    '## Start here',
    '',
    ...(win
      ? [
          'Double-click **Start Here.bat**.',
          '',
          'Windows may show a blue "Windows protected your PC" box, because this',
          'download is not code-signed. Click **More info**, then **Run anyway**.',
        ]
      : mac
        ? [
            'Double-click **Start Here.command**.',
            '',
            'macOS will probably refuse the first time, because this download is',
            'not signed by an Apple developer account. That is expected. To allow it:',
            '',
            '1. Open **System Settings** → **Privacy & Security**.',
            '2. Scroll down. You will see a line about "sah" being blocked.',
            '3. Click **Open Anyway**.',
            '4. Double-click **Start Here.command** again.',
            '',
            'Or, from Terminal, allow just this one file:',
            '',
            '```',
            'xattr -d com.apple.quarantine ./sah',
            './sah start',
            '```',
            '',
            'Do not turn Gatekeeper off system-wide. You never need to, and it',
            'protects everything else you download.',
          ]
        : [
            'Run **Start Here.sh**, or from a terminal in this folder:',
            '',
            '```',
            './sah start',
            '```',
          ]),
    '',
    '## What you can do',
    '',
    '```',
    `${runLine} start        Create a new mod project, guided step by step.`,
    `${runLine} tools        Six jobs you do to a mod folder, as a menu.`,
    `${runLine} help         Plain-language help.`,
    '```',
    '',
    '`sah start` asks a few questions, then makes you a mod project folder with',
    'editor autocomplete already set up.',
    '',
    '## Editor autocomplete',
    '',
    '`sah start` can set this up for you. The `editor-definitions` folder here',
    'holds the same file if you want to add it to a project by hand — see the',
    'README in that folder.',
    '',
    'You will want an editor with the **Lua Language Server** extension',
    '(`sumneko.lua` in VS Code).',
    '',
    '## What this cannot do',
    '',
    'This toolkit prepares and inspects **files**. It cannot tell you whether',
    'your mod works when you play it, and nothing here has been run in the game.',
    '',
    'To actually play a mod you separately need:',
    '',
    '- a lawful copy of The Simpsons: Hit & Run,',
    "- Lucas' Simpsons: Hit & Run Mod Launcher (Windows),",
    "- Donut Team's Game.lua.",
    '',
    'None of those are included here, and this toolkit does not replace any of',
    'them.',
    '',
    '## Licence and credits',
    '',
    'MIT — see LICENSE. Third-party notices are in THIRD_PARTY_NOTICES.md.',
    '',
    'This is an unofficial fan project. It is not affiliated with, endorsed by,',
    'or sponsored by Electronic Arts, Disney, Fox, Radical Entertainment or',
    'Donut Team. It contains no game files.',
    '',
    '**Built with AI assistance.** The code, tests and documentation were',
    "written by Claude working in the project's repository, with design and",
    'acceptance decisions from the maintainer. The tests and published checksums',
    'are the things to trust.',
    '',
    'Source, documentation and issues:',
    'https://github.com/22500107Zc/springfield-after-hours-toolkit',
    '',
  ].join('\n')}`;
}

/**
 * The double-clickable wrapper.
 *
 * `cd` to the script's own directory first: double-clicking gives the process
 * an unrelated working directory, and `./sah` would not be found.
 */
function startHere(target) {
  if (target.os === 'win32') {
    return {
      name: 'Start Here.bat',
      contents: [
        '@echo off',
        'cd /d "%~dp0"',
        'echo.',
        'echo   Springfield After Hours Toolkit',
        'echo.',
        'sah.exe help',
        'echo.',
        'echo   Type:  sah start     to make a new mod project',
        'echo.',
        'cmd /k',
        '',
      ].join('\r\n'),
      mode: 0o755,
    };
  }

  const name = target.os === 'darwin' ? 'Start Here.command' : 'Start Here.sh';
  return {
    name,
    contents: [
      '#!/bin/sh',
      '# Double-click this file to open the toolkit.',
      '',
      '# Double-clicking does not set the working directory to this folder.',
      'cd "$(dirname "$0")" || exit 1',
      '',
      'echo ""',
      'echo "  Springfield After Hours Toolkit"',
      'echo ""',
      '',
      './sah help',
      '',
      'echo ""',
      'echo "  Type:  ./sah start     to make a new mod project"',
      'echo ""',
      '',
      '# Keep the window open so the text above can be read.',
      'exec "${SHELL:-/bin/sh}"',
      '',
    ].join('\n'),
    mode: 0o755,
  };
}

function stageTarget(target) {
  const source = path.join(binariesDir, target.id, target.exe);
  if (!fs.existsSync(source)) return undefined;

  const folder = `sah-${version}-${target.id}`;
  const stage = path.join(stageRoot, folder);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });

  fs.copyFileSync(source, path.join(stage, target.exe));
  if (target.os !== 'win32') fs.chmodSync(path.join(stage, target.exe), 0o755);

  for (const file of commonFiles()) {
    const to = path.join(stage, file.to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(file.from, to);
  }

  fs.writeFileSync(path.join(stage, 'README.md'), beginnerReadme(target), 'utf8');

  const starter = startHere(target);
  const starterPath = path.join(stage, starter.name);
  fs.writeFileSync(starterPath, starter.contents, 'utf8');
  fs.chmodSync(starterPath, starter.mode);

  return { folder, stage };
}

function archive(target, staged) {
  fs.mkdirSync(outDir, { recursive: true });

  if (target.os === 'win32') {
    const out = path.join(outDir, `${staged.folder}.zip`);
    fs.rmSync(out, { force: true });
    execFileSync('zip', ['-r', '-q', out, staged.folder], { cwd: stageRoot, stdio: 'inherit' });
    return out;
  }

  // tar preserves the executable bit; zip does not, reliably.
  const out = path.join(outDir, `${staged.folder}.tar.gz`);
  fs.rmSync(out, { force: true });
  execFileSync('tar', ['-czf', out, staged.folder], { cwd: stageRoot, stdio: 'inherit' });
  return out;
}

function main() {
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
  const targets = only ? TARGETS.filter((t) => t.id === only) : TARGETS;

  fs.mkdirSync(stageRoot, { recursive: true });
  const made = [];

  for (const target of targets) {
    const staged = stageTarget(target);
    if (!staged) {
      process.stdout.write(`skipping ${target.id}: no binary built\n`);
      continue;
    }
    const out = archive(target, staged);
    const size = fs.statSync(out).size;
    made.push({ target: target.id, path: out, bytes: size });
    process.stdout.write(`${target.id}: ${(size / 1024 / 1024).toFixed(1)} MB -> ${out}\n`);
  }

  if (made.length === 0) {
    process.stderr.write('No archives were made. Run "npm run dist:binaries" first.\n');
    process.exit(1);
  }
}

// Concatenating the "file://" scheme onto process.argv[1] looks equivalent
// and is not: on Windows argv[1] is a backslashed drive path, so that
// comparison is always false and the script exits silently having done
// nothing. That is how the Windows download went missing from the first
// 0.1.1 release attempt.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
