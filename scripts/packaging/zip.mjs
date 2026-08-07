/**
 * A zip writer and reader, in Node, with no external tool.
 *
 * The Windows runner ships neither `zip` nor `unzip`, so shelling out worked on
 * three platforms and failed on the one that actually needs a .zip. Node has
 * everything required — zlib for deflate, and the format itself is small — so
 * the archive is built the same way everywhere and the release stops depending
 * on what happens to be installed.
 *
 * Deterministic by construction: entries are written in sorted order and every
 * timestamp is the DOS epoch, so the same input bytes always produce the same
 * archive bytes.
 *
 * Format reference: PKWARE APPNOTE 6.3.x, sections 4.3.7 (local header),
 * 4.3.12 (central directory) and 4.3.16 (end of central directory). Only the
 * two methods needed here are implemented: stored and deflate. No zip64, so an
 * entry over 4 GiB is rejected rather than written wrong.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

const STORED = 0;
const DEFLATED = 8;

/** DOS timestamps start at 1980; 0/0 is that epoch, and is stable. */
const DOS_TIME = 0;
const DOS_DATE = 0;

const FOUR_GIB = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Every file and directory under `root`, as zip entry names prefixed with
 * `top`, sorted by code unit so the ordering never depends on the filesystem.
 */
function collect(root, top) {
  const entries = [];

  const walk = (absolute, relative) => {
    const names = fs.readdirSync(absolute).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
    for (const name of names) {
      const child = path.join(absolute, name);
      const childRelative = relative === '' ? name : `${relative}/${name}`;
      const stat = fs.lstatSync(child);
      if (stat.isSymbolicLink()) {
        throw new Error(`refusing to archive a symlink: ${childRelative}`);
      }
      if (stat.isDirectory()) {
        entries.push({ name: `${top}/${childRelative}/`, directory: true, mode: 0o755 });
        walk(child, childRelative);
      } else if (stat.isFile()) {
        entries.push({
          name: `${top}/${childRelative}`,
          directory: false,
          source: child,
          // The exec bit is recorded, though no zip reader on Windows uses it.
          mode: stat.mode & 0o111 ? 0o755 : 0o644,
        });
      } else {
        throw new Error(`refusing to archive a non-regular file: ${childRelative}`);
      }
    }
  };

  entries.push({ name: `${top}/`, directory: true, mode: 0o755 });
  walk(root, '');
  return entries;
}

function externalAttributes(entry) {
  // Upper 16 bits: unix mode. Lower: MS-DOS attributes, where 0x10 is
  // "directory" — Explorer reads that one.
  const unix = (entry.mode | (entry.directory ? 0o040000 : 0o100000)) << 16;
  return (unix | (entry.directory ? 0x10 : 0)) >>> 0;
}

/**
 * Write `root`'s contents to `outPath` as a zip, under a single top-level
 * folder named `top`.
 */
export function writeZip(outPath, root, top) {
  const entries = collect(root, top);
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    let data = Buffer.alloc(0);
    let method = STORED;
    let crc = 0;
    let uncompressed = 0;

    if (!entry.directory) {
      const raw = fs.readFileSync(entry.source);
      if (raw.length > FOUR_GIB) {
        throw new Error(`${entry.name} is too large for a non-zip64 archive`);
      }
      crc = crc32(raw);
      uncompressed = raw.length;
      const deflated = zlib.deflateRawSync(raw, { level: 9 });
      // Storing is smaller than deflating for already-compressed data, and a
      // reader handles both.
      if (deflated.length < raw.length) {
        data = deflated;
        method = DEFLATED;
      } else {
        data = raw;
      }
    }

    const name = Buffer.from(entry.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(uncompressed, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    chunks.push(local, name, data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_SIG, 0);
    header.writeUInt16LE(0x031e, 4); // made by: unix, spec 3.0
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(0, 8); // flags
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(DOS_TIME, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(uncompressed, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30); // extra length
    header.writeUInt16LE(0, 32); // comment length
    header.writeUInt16LE(0, 34); // disk number
    header.writeUInt16LE(0, 36); // internal attributes
    header.writeUInt32LE(externalAttributes(entry), 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    offset += local.length + name.length + data.length;
  }

  const centralStart = offset;
  const centralBytes = Buffer.concat(central);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // this disk
  eocd.writeUInt16LE(0, 6); // disk with central directory
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  fs.writeFileSync(outPath, Buffer.concat([...chunks, centralBytes, eocd]));
  return entries.length;
}

/** Entry names in `file`, read from its central directory. */
export function listZip(file) {
  const buffer = fs.readFileSync(file);

  // The EOCD is at the end, after a comment of unknown length. There is no
  // comment here, but scan anyway rather than assume our own writer.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error(`${file} is not a zip archive (no end of central directory)`);

  const count = buffer.readUInt16LE(eocd + 10);
  let position = buffer.readUInt32LE(eocd + 16);

  const names = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(position) !== CENTRAL_SIG) {
      throw new Error(`${file}: corrupt central directory at entry ${i}`);
    }
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    names.push(buffer.toString('utf8', position + 46, position + 46 + nameLength));
    position += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}
