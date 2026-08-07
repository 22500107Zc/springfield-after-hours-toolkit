import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error - a build script, deliberately plain JS with no declarations.
import { crc32, listZip, writeZip } from '../scripts/packaging/zip.mjs';

/**
 * The Windows download is a .zip, and the Windows runner has neither zip(1) nor
 * unzip(1) — which is how the second 0.1.1 release attempt failed, on the one
 * platform whose archive format needed them. The writer is therefore pure Node,
 * and these tests run on every platform CI covers, including that one.
 */

let root: string;
let source: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-zip-'));
  source = path.join(root, 'src');
  fs.mkdirSync(path.join(source, 'nested', 'deeper'), { recursive: true });
  fs.writeFileSync(path.join(source, 'README.md'), '# hello\n');
  fs.writeFileSync(path.join(source, 'binary.bin'), crypto.randomBytes(4096));
  // Highly compressible, so the deflate path is exercised as well as stored.
  fs.writeFileSync(path.join(source, 'repetitive.txt'), 'a'.repeat(100_000));
  fs.writeFileSync(path.join(source, 'Start Here.sh'), '#!/bin/sh\necho hi\n', { mode: 0o755 });
  fs.writeFileSync(path.join(source, 'nested', 'one.txt'), 'one\n');
  fs.writeFileSync(path.join(source, 'nested', 'deeper', 'two.txt'), 'two\n');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function write(name = 'out.zip'): string {
  const out = path.join(root, name);
  writeZip(out, source, 'top');
  return out;
}

describe('crc32', () => {
  it('matches the published check values', () => {
    // The standard CRC-32 check value: "123456789" -> 0xCBF43926.
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('writeZip', () => {
  it('produces a file with the zip local-header signature', () => {
    const out = write();
    const head = fs.readFileSync(out).subarray(0, 4);
    expect([...head]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('contains every file and directory under a single top-level folder', () => {
    const names = listZip(write()) as string[];
    expect(names).toContain('top/');
    expect(names).toContain('top/README.md');
    expect(names).toContain('top/binary.bin');
    expect(names).toContain('top/repetitive.txt');
    expect(names).toContain('top/Start Here.sh');
    expect(names).toContain('top/nested/');
    expect(names).toContain('top/nested/one.txt');
    expect(names).toContain('top/nested/deeper/');
    expect(names).toContain('top/nested/deeper/two.txt');
    for (const name of names) expect(name.startsWith('top/')).toBe(true);
  });

  it('is byte-identical across runs', () => {
    const digest = (file: string): string =>
      crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    expect(digest(write('a.zip'))).toBe(digest(write('b.zip')));
  });

  it('carries no timestamp that would vary between runs', () => {
    // Every DOS time/date field is the epoch, so two builds a day apart match.
    const bytes = fs.readFileSync(write());
    expect(bytes.readUInt16LE(10)).toBe(0);
    expect(bytes.readUInt16LE(12)).toBe(0);
  });

  it('refuses to archive a symlink rather than following it', () => {
    const withLink = path.join(root, 'linked');
    fs.mkdirSync(withLink, { recursive: true });
    fs.writeFileSync(path.join(withLink, 'real.txt'), 'real\n');
    try {
      fs.symlinkSync(path.join(source, 'README.md'), path.join(withLink, 'link.md'));
    } catch {
      // Unprivileged Windows cannot create symlinks; nothing to assert there.
      return;
    }
    expect(() => writeZip(path.join(root, 'linked.zip'), withLink, 'top')).toThrow(/symlink/);
  });
});

describe('listZip', () => {
  it('round-trips what writeZip wrote', () => {
    const out = write();
    const names = (listZip(out) as string[]).slice().sort();
    const expected = [
      'top/',
      'top/README.md',
      'top/Start Here.sh',
      'top/binary.bin',
      'top/nested/',
      'top/nested/deeper/',
      'top/nested/deeper/two.txt',
      'top/nested/one.txt',
      'top/repetitive.txt',
    ].sort();
    expect(names).toEqual(expected);
  });

  it('rejects a file that is not a zip', () => {
    const notZip = path.join(root, 'not.zip');
    fs.writeFileSync(notZip, 'this is not an archive');
    expect(() => listZip(notZip)).toThrow(/not a zip archive/);
  });
});

describe('agreement with the system unzip, where there is one', () => {
  const hasUnzip = (): boolean => {
    try {
      execFileSync('unzip', ['-v'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };

  it.runIf(hasUnzip())('extracts to exactly the input tree', () => {
    const out = write('roundtrip.zip');
    const into = path.join(root, 'extracted');
    fs.rmSync(into, { recursive: true, force: true });
    execFileSync('unzip', ['-q', out, '-d', into], { stdio: 'inherit' });

    const walk = (dir: string, prefix = ''): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory()
            ? walk(path.join(dir, entry.name), `${prefix}${entry.name}/`)
            : [`${prefix}${entry.name}`],
        )
        .sort();

    expect(walk(path.join(into, 'top'))).toEqual(walk(source));

    for (const relative of walk(source)) {
      expect(
        fs
          .readFileSync(path.join(into, 'top', relative))
          .equals(fs.readFileSync(path.join(source, relative))),
        relative,
      ).toBe(true);
    }
  });

  it.runIf(hasUnzip())('passes the archive integrity test', () => {
    const output = execFileSync('unzip', ['-t', write('integrity.zip')], { encoding: 'utf8' });
    expect(output).toMatch(/No errors detected/);
  });
});
