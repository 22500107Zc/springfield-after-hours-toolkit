#!/usr/bin/env node
/**
 * Runs every check CI runs, in the same order, and reports a summary.
 *
 * Exists so "did I break anything?" is one command rather than five, and so the
 * local answer matches the CI answer.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const steps = [
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint', 'npm', ['run', 'lint']],
  ['format', 'npm', ['run', 'format:check']],
  ['test', 'npm', ['test']],
  ['build', 'npm', ['run', 'build']],
  ['registry drift', 'node', ['scripts/research/derive-command-registry.mjs', '--check']],
  ['lua definitions current', 'node', ['packages/cli/dist/bin.js', 'lua-defs', 'check']],
  [
    'minimal campaign builds',
    'node',
    ['packages/cli/dist/bin.js', 'build', 'examples/minimal-campaign', '--dry-run'],
  ],
  ['pocket tools smoke test', 'node', ['scripts/development/pocket-smoke.mjs']],
];

const results = [];

for (const [name, command, args] of steps) {
  process.stdout.write(`\n── ${name} ${'─'.repeat(Math.max(0, 50 - name.length))}\n`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  results.push([name, result.status === 0]);
}

// The flagship example must FAIL. A pass means the verification gate broke.
process.stdout.write(`\n── springfield-after-hours must not build ─────────\n`);
const flagship = spawnSync(
  'node',
  ['packages/cli/dist/bin.js', 'validate', 'examples/springfield-after-hours'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
results.push(['springfield-after-hours correctly refused', flagship.status !== 0]);

process.stdout.write('\n\nSummary\n');
let failed = 0;
for (const [name, ok] of results) {
  process.stdout.write(`  ${ok ? 'pass' : 'FAIL'}  ${name}\n`);
  if (!ok) failed += 1;
}

process.stdout.write(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed === 0 ? 0 : 1);
