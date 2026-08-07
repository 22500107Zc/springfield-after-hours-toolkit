import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A retired runner label does not fail — it queues forever. `macos-13` was
 * retired during 0.1.1, and the Intel build job sat unassigned through four
 * release attempts while every other platform finished in about thirty
 * seconds. Nothing reported an error; the run simply never ended.
 *
 * So retired labels are asserted against by name. This is a list that has to be
 * maintained by hand, which is the point: retiring a runner is news, and this
 * is where that news gets recorded.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const workflowsDir = path.join(repoRoot, '.github', 'workflows');

/** Labels GitHub no longer schedules. A job asking for one never starts. */
const RETIRED_RUNNERS = ['macos-11', 'macos-12', 'macos-13', 'ubuntu-18.04', 'ubuntu-20.04'];

const workflows = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name));

/** `runs-on:` values, including the matrix entries they are usually built from. */
function runnerLabels(source: string): string[] {
  const labels = new Set<string>();
  for (const match of source.matchAll(/^\s*runs-on:\s*(.+)$/gm)) {
    labels.add((match[1] ?? '').trim());
  }
  // Matrix rows: `runner: macos-14`, and `os: [ubuntu-latest, macos-latest]`.
  for (const match of source.matchAll(/^\s*(?:runner|os):\s*(.+)$/gm)) {
    const value = (match[1] ?? '').trim();
    if (value.startsWith('[')) {
      for (const entry of value.slice(1, -1).split(',')) labels.add(entry.trim());
    } else {
      labels.add(value);
    }
  }
  return [...labels];
}

describe('workflow runner labels', () => {
  it('finds the workflows', () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)('%s asks for no retired runner', (name) => {
    const labels = runnerLabels(fs.readFileSync(path.join(workflowsDir, name), 'utf8'));
    for (const retired of RETIRED_RUNNERS) {
      expect(labels, `${name} would queue forever on ${retired}`).not.toContain(retired);
    }
  });

  it('still builds the Intel macOS download on an Intel runner', () => {
    // Cross-building it and calling it tested is the thing this must not
    // silently become.
    const release = fs.readFileSync(path.join(workflowsDir, 'release.yml'), 'utf8');
    expect(release).toMatch(/target:\s*macos-intel\s*\n\s*runner:\s*macos-15-intel/);
  });
});
