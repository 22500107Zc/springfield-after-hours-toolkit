/**
 * A minimal reader for the two INI files a Mod Launcher mod ships: `Meta.ini`
 * and `CustomFiles.ini`.
 *
 * Deliberately not a general INI library. It reads only what those files
 * actually contain: `[Section]` headers, `Key=Value` lines where a key may
 * repeat, and `;` comments.
 *
 * `CustomFiles.ini` keys are game paths written with doubled backslashes, so
 * unescaping is a separate explicit step ({@link unescapeIniPath}) rather than
 * something the parser guesses at — a `Description=` in `Meta.ini` is prose and
 * must be left exactly as written.
 */

export interface IniEntry {
  section: string;
  key: string;
  value: string;
  /** 1-based line number, so a report can point back at the file. */
  line: number;
}

export interface ParsedIni {
  entries: IniEntry[];
}

export function parseIni(text: string): ParsedIni {
  const entries: IniEntry[] = [];
  let section = '';

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();
    if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    const header = /^\[(.*)\]$/.exec(trimmed);
    if (header) {
      section = header[1]?.trim() ?? '';
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    entries.push({
      section,
      key: trimmed.slice(0, separator).trim(),
      value: trimmed.slice(separator + 1).trim(),
      line: index + 1,
    });
  }

  return { entries };
}

/** Every entry in one section, matched case-insensitively on the section name. */
export function entriesIn(ini: ParsedIni, section: string): IniEntry[] {
  const wanted = section.toLowerCase();
  return ini.entries.filter((entry) => entry.section.toLowerCase() === wanted);
}

/** The first value for a key in a section, or undefined. */
export function firstValue(ini: ParsedIni, section: string, key: string): string | undefined {
  const wanted = key.toLowerCase();
  return entriesIn(ini, section).find((entry) => entry.key.toLowerCase() === wanted)?.value;
}

/** Undoes the backslash doubling that Custom Files path keys are written with. */
export function unescapeIniPath(key: string): string {
  return key.replace(/\\\\/g, '\\');
}
