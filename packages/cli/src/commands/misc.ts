import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_HELP,
  EXIT_CODES,
  listFilesRecursive,
  redactConfig,
  sha256,
  type ExitCode,
} from '@sah/core';
import { createContext } from '../context.js';
import { printError, printJson, printLine, renderTable } from '../output.js';

/** `sah config` — shows the effective configuration and where each value came from. */
export function runConfig(options: { target?: string; json: boolean }): ExitCode {
  const context = createContext(options.target ? { campaignRoot: options.target } : {});
  const safe = redactConfig(context.config);

  if (options.json) {
    printJson({
      ok: true,
      command: 'config',
      config: safe,
      layers: context.configLayers.map((layer) => ({
        source: layer.source,
        keys: Object.keys(layer.values).sort(),
      })),
      note: 'ANTHROPIC_API_KEY is never part of configuration. It is read from the environment only, and its value is never printed.',
    });
    return EXIT_CODES.OK;
  }

  printLine('Effective configuration');
  printLine();
  renderTable(
    Object.entries(safe).map(
      ([key, value]) =>
        [key, Array.isArray(value) ? value.join(', ') || '(none)' : String(value ?? '(unset)')] as [
          string,
          string,
        ],
    ),
  );

  printLine();
  printLine('Precedence (lowest first — later layers win):');
  for (const layer of context.configLayers) {
    const keys = Object.keys(layer.values);
    printLine(`  ${layer.source}${keys.length > 0 ? `: ${keys.sort().join(', ')}` : ''}`);
  }

  printLine();
  printLine('ANTHROPIC_API_KEY is deliberately not a configuration value. It is read from');
  printLine('the environment only, so it cannot be committed in a config file.');
  return EXIT_CODES.OK;
}

/** `sah explain <code>` — turns a diagnostic code into an explanation. */
export function runExplain(options: { code: string; json: boolean }): ExitCode {
  const code = options.code.toUpperCase();
  const help = DIAGNOSTIC_HELP[code];

  if (!help) {
    const known = Object.keys(DIAGNOSTIC_HELP).sort().join(', ');
    if (options.json) {
      printJson({ ok: false, command: 'explain', code, error: 'Unknown diagnostic code', known });
    } else {
      printError(`Unknown diagnostic code "${code}".`);
      printError(`Known codes: ${known}`);
    }
    return EXIT_CODES.USAGE;
  }

  if (options.json) {
    printJson({ ok: true, command: 'explain', code, ...help });
    return EXIT_CODES.OK;
  }

  printLine(`${code} — ${help.title}`);
  printLine();
  printLine(help.meaning);
  printLine();
  printLine('How to fix it:');
  for (const step of help.fixes) printLine(`  - ${step}`);
  if (help.why) {
    printLine();
    printLine(`Why this is an error: ${help.why}`);
  }
  return EXIT_CODES.OK;
}

/**
 * `sah package` — produces a distributable archive of a built mod.
 *
 * Uses a stored (uncompressed) ZIP written by hand rather than pulling in an
 * archiver dependency, so the output is byte-for-byte reproducible and the
 * toolkit keeps its dependency surface small.
 */
export function runPackage(options: {
  target: string;
  outputFile?: string;
  json: boolean;
}): ExitCode {
  const context = createContext({ campaignRoot: options.target });
  const root = path.resolve(options.target);
  const buildDirectory = path.join(root, context.config.buildDirectory);

  if (!fs.existsSync(buildDirectory)) {
    const message = `No build output found at ${buildDirectory}. Run "sah build" first.`;
    if (options.json) printJson({ ok: false, command: 'package', error: message });
    else printError(message);
    return EXIT_CODES.NOT_FOUND;
  }

  const files = listFilesRecursive(buildDirectory);
  if (files.length === 0) {
    const message = `Build directory ${buildDirectory} is empty.`;
    if (options.json) printJson({ ok: false, command: 'package', error: message });
    else printError(message);
    return EXIT_CODES.NOT_FOUND;
  }

  const outputFile = path.resolve(
    options.outputFile ?? path.join(root, `${path.basename(root)}.zip`),
  );

  const entries = files.map((relative) => ({
    name: relative,
    data: fs.readFileSync(path.join(buildDirectory, relative)),
  }));

  const archive = createZip(entries);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, archive);

  if (options.json) {
    printJson({
      ok: true,
      command: 'package',
      outputFile,
      entries: entries.length,
      bytes: archive.length,
      sha256: sha256(archive),
    });
    return EXIT_CODES.OK;
  }

  printLine(`Packaged ${entries.length} file(s) into ${outputFile}`);
  printLine(`  ${archive.length} bytes, sha256 ${sha256(archive)}`);
  printLine();
  printLine('Before distributing, confirm the archive contains only your own work:');
  printLine("  no game files, no extracted audio, no assets from other people's mods.");
  return EXIT_CODES.OK;
}

/**
 * Minimal deterministic ZIP writer (deflate, no timestamps).
 *
 * Everything about it is fixed — no modification times, no extra fields — so
 * packaging identical input twice produces identical bytes.
 */
function createZip(entries: ReadonlyArray<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const compressed = zlib.deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(0, 10); // mod time — fixed for determinism
    localHeader.writeUInt16LE(0x21, 12); // mod date — fixed (1980-01-01)
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x21, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + compressed.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, central, end]);
}

let crcTable: Uint32Array | undefined;

function crc32(data: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Exported so tests can assert the code table stays in sync with the help text. */
export const ALL_DIAGNOSTIC_CODES = Object.values(DIAGNOSTIC_CODES);
