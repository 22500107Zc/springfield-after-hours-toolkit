import fs from 'node:fs';
import path from 'node:path';
import { EXIT_CODES, type ExitCode } from '@sah/core';
import {
  DEFAULT_MANIFEST_NAME,
  PocketToolError,
  buildManifest,
  checkCase,
  checkConflicts,
  cleanExport,
  cleanInPlace,
  diffReleases,
  hasDifferences,
  isPathFormName,
  planClean,
  projectPath,
  renderManifestText,
  serialiseManifest,
  type PathFormName,
} from '@sah/pocket-tools';
import { copyToClipboard } from '../clipboard.js';
import { printError, printJson, printLine, renderTable } from '../output.js';

/**
 * `sah pocket` — SHAR Pocket Tools.
 *
 * Six utilities for preparing a mod folder. None of them knows anything about
 * the game, and that is deliberate: everything here is testable without owning
 * The Simpsons: Hit & Run or installing the Mod Launcher.
 *
 * Exit codes are uniform across all six:
 *
 * | Code | Meaning                                                        |
 * | ---- | -------------------------------------------------------------- |
 * | 0    | ran, and found nothing to report                                |
 * | 1    | ran, and found something — collisions, conflicts, differences   |
 * | 2    | could not run: a path was missing, unusable, or outside scope   |
 * | 70   | an unexpected internal error                                    |
 *
 * Code 1 is a *finding*, not a failure. `sah pocket diff` in particular returns
 * 1 whenever two releases differ, which is the normal case.
 */

/**
 * Runs a tool, turning its errors into the plain-language output a
 * non-programmer can act on.
 */
function guard(json: boolean, command: string, body: () => ExitCode): ExitCode {
  try {
    return body();
  } catch (error) {
    if (error instanceof PocketToolError) {
      if (json) {
        printJson({ ok: false, command, error: error.message, hint: error.hint ?? null });
      } else {
        printError(error.message);
        if (error.hint) printError(error.hint);
      }
      return EXIT_CODES.USAGE;
    }
    throw error;
  }
}

// --- 1. case-check ----------------------------------------------------------

export interface CaseCheckCommandOptions {
  directory: string;
  references: boolean;
  json: boolean;
}

export function runPocketCaseCheck(options: CaseCheckCommandOptions): ExitCode {
  return guard(options.json, 'pocket case-check', () => {
    const result = checkCase({ root: options.directory, checkReferences: options.references });

    if (options.json) {
      printJson({
        ok: result.ok,
        command: 'pocket case-check',
        filesScanned: result.filesScanned,
        textFilesRead: result.textFilesRead,
        collisions: result.collisions,
        references: result.references,
        skipped: result.skipped,
      });
      return result.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
    }

    printLine(`Checked ${result.filesScanned} files in ${result.root}`);
    if (options.references) {
      printLine(`Read ${result.textFilesRead} text files looking for path references.`);
    }
    printLine();

    if (result.collisions.length > 0) {
      printLine(`Paths that differ only by letter case (${result.collisions.length}):`);
      for (const collision of result.collisions) {
        printLine(`  ${collision.type} "${collision.lowercased}"`);
        for (const member of collision.paths) printLine(`    ${member}`);
      }
      printLine();
      printLine('  On macOS these are one item. In a zip, or on Linux, they are two.');
      printLine();
    }

    if (result.references.length > 0) {
      printLine(`References whose casing does not match the file (${result.references.length}):`);
      for (const reference of result.references) {
        printLine(`  ${reference.file}:${reference.line}:${reference.column}`);
        printLine(`    written:  ${reference.referenced}`);
        printLine(`    actual:   ${reference.actual}`);
        printLine(`    suggest:  ${reference.suggestion}`);
      }
      printLine();
    }

    if (result.skipped.length > 0) {
      printLine(`Not examined (${result.skipped.length}):`);
      for (const entry of result.skipped) printLine(`  ${entry.path} — ${entry.reason}`);
      printLine();
    }

    if (result.ok) {
      printLine('No case problems found.');
      return EXIT_CODES.OK;
    }

    printLine('Nothing has been changed. Fix these by renaming files or editing the references.');
    return EXIT_CODES.VALIDATION_FAILED;
  });
}

// --- 2. clean-export --------------------------------------------------------

export interface CleanExportCommandOptions {
  source: string;
  destination?: string;
  inPlace: boolean;
  yes: boolean;
  force: boolean;
  json: boolean;
}

export function runPocketCleanExport(options: CleanExportCommandOptions): ExitCode {
  return guard(options.json, 'pocket clean-export', () => {
    // Preview only: no destination, no --in-place.
    if (!options.destination && !options.inPlace) {
      const plan = planClean(options.source);
      if (options.json) {
        printJson({
          ok: true,
          command: 'pocket clean-export',
          mode: 'preview',
          junk: plan.junk,
          junkBytes: plan.junkBytes,
          keptFiles: plan.keep.length,
          keptBytes: plan.keptBytes,
          symlinks: plan.symlinks,
          skipped: plan.skipped,
        });
        return EXIT_CODES.OK;
      }

      renderJunkPreview(plan.junk, plan.junkBytes, plan.keep.length, plan.symlinks);
      printLine();
      printLine('Nothing has been changed. To make a clean copy:');
      printLine(`  sah pocket clean-export "${options.source}" <destination>`);
      return plan.junk.length > 0 ? EXIT_CODES.VALIDATION_FAILED : EXIT_CODES.OK;
    }

    if (options.inPlace) {
      if (!options.yes) {
        const plan = planClean(options.source);
        if (options.json) {
          printJson({
            ok: false,
            command: 'pocket clean-export',
            mode: 'in-place',
            confirmed: false,
            error: 'in-place deletion requires --yes',
            junk: plan.junk,
          });
          return EXIT_CODES.USAGE;
        }
        renderJunkPreview(plan.junk, plan.junkBytes, plan.keep.length, plan.symlinks);
        printLine();
        printError('Refusing to delete from the original folder without confirmation.');
        printError('Re-run with --in-place --yes if that is really what you want.');
        printError('Safer: leave out --in-place to write a clean copy instead.');
        return EXIT_CODES.USAGE;
      }

      const result = cleanInPlace({ source: options.source, confirm: true });
      if (options.json) {
        printJson({
          ok: result.errors.length === 0,
          command: 'pocket clean-export',
          mode: 'in-place',
          removed: result.removed,
          errors: result.errors,
        });
        return result.errors.length === 0 ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
      }

      printLine(`Removed ${result.removed.length} items from ${result.plan.source}`);
      for (const removed of result.removed) printLine(`  removed  ${removed}`);
      for (const error of result.errors) printError(`  kept     ${error}`);
      return result.errors.length === 0 ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
    }

    const destination = options.destination;
    if (!destination) {
      // Unreachable through the CLI; kept so the function is total.
      throw new PocketToolError('An export destination is required.');
    }

    const result = cleanExport({
      source: options.source,
      destination,
      force: options.force,
    });

    if (options.json) {
      printJson({
        ok: result.errors.length === 0,
        command: 'pocket clean-export',
        mode: 'export',
        destination: result.destination,
        copied: result.copied.length,
        linked: result.linked.length,
        junkExcluded: result.plan.junk,
        junkBytes: result.plan.junkBytes,
        symlinks: result.plan.symlinks,
        errors: result.errors,
      });
      return result.errors.length === 0 ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
    }

    printLine(`Clean copy written to ${result.destination}`);
    printLine();
    renderTable([
      ['files copied', String(result.copied.length)],
      ['links recreated', String(result.linked.length)],
      [
        'junk left behind',
        `${result.plan.junk.length} items, ${formatBytes(result.plan.junkBytes)}`,
      ],
    ]);
    if (result.plan.junk.length > 0) {
      printLine();
      printLine('Excluded:');
      for (const entry of result.plan.junk) {
        printLine(`  ${entry.path}  (${entry.why})`);
      }
    }
    const skippedLinks = result.plan.symlinks.filter((link) => link.action === 'skipped');
    if (skippedLinks.length > 0) {
      printLine();
      printLine('Symbolic links not exported:');
      for (const link of skippedLinks) printLine(`  ${link.path} — ${link.reason}`);
    }
    for (const error of result.errors) printError(`  ${error}`);
    printLine();
    printLine(`The original folder was not modified.`);
    return result.errors.length === 0 ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  });
}

function renderJunkPreview(
  junk: ReadonlyArray<{ path: string; why: string; bytes: number; type: string }>,
  junkBytes: number,
  keptFiles: number,
  symlinks: ReadonlyArray<{ path: string; reason: string; action: string }>,
): void {
  if (junk.length === 0) {
    printLine(`No junk found. ${keptFiles} files would be exported unchanged.`);
  } else {
    printLine(`Found ${junk.length} junk items (${formatBytes(junkBytes)}):`);
    for (const entry of junk) {
      printLine(`  ${entry.path}${entry.type === 'directory' ? '/' : ''}  — ${entry.why}`);
    }
    printLine();
    printLine(`${keptFiles} other files would be kept.`);
  }
  const skipped = symlinks.filter((link) => link.action === 'skipped');
  if (skipped.length > 0) {
    printLine();
    printLine('Symbolic links that would not be exported:');
    for (const link of skipped) printLine(`  ${link.path} — ${link.reason}`);
  }
}

// --- 3. conflicts -----------------------------------------------------------

export function runPocketConflicts(options: { directories: string[]; json: boolean }): ExitCode {
  return guard(options.json, 'pocket conflicts', () => {
    const report = checkConflicts(options.directories);

    if (options.json) {
      printJson({
        ok: report.ok,
        command: 'pocket conflicts',
        mods: report.mods,
        counts: report.counts,
        potentialConflicts: report.conflicts,
      });
      return report.ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
    }

    printLine(`Compared ${report.mods.length} mods:`);
    renderTable(
      report.mods.map(
        (mod) =>
          [
            `  ${mod.name}`,
            `${mod.fileCount} files, ${mod.claimedGamePaths.length} claimed game paths`,
          ] as [string, string],
      ),
      '',
    );
    for (const mod of report.mods) {
      for (const note of mod.notes) printLine(`  note (${mod.name}): ${note}`);
    }
    printLine();

    if (report.ok) {
      printLine('No potential file conflicts found.');
      printLine();
      printLine('This compares files only. Two mods can still interfere with each');
      printLine('other in ways no file comparison can see.');
      return EXIT_CODES.OK;
    }

    printLine(`Potential file conflicts (${report.conflicts.length}):`);
    printLine();
    for (const conflict of report.conflicts) {
      printLine(`  [${conflict.kind}] ${conflict.subject}`);
      if (conflict.identical === true) printLine('    every copy is byte-identical');
      if (conflict.identical === false) printLine('    the copies DIFFER');
      for (const participant of conflict.participants) {
        const hash = participant.sha256 ? `  ${participant.sha256.slice(0, 16)}…` : '';
        printLine(`    ${participant.mod}: ${participant.where}${hash}`);
      }
      printLine();
    }

    printLine('These are potential conflicts, not proven ones. This tool compares');
    printLine('files; it does not know what the game or the Mod Launcher does when');
    printLine('two mods supply the same path.');
    return EXIT_CODES.VALIDATION_FAILED;
  });
}

// --- 4. manifest ------------------------------------------------------------

export interface ManifestCommandOptions {
  directory: string;
  output?: string;
  format: 'json' | 'text';
  json: boolean;
}

export function runPocketManifest(options: ManifestCommandOptions): ExitCode {
  return guard(options.json, 'pocket manifest', () => {
    const outputPath = options.output ? path.resolve(options.output) : undefined;
    const root = path.resolve(options.directory);

    // A manifest written inside the folder it describes must not describe
    // itself, or the next run would differ from this one.
    const exclude: string[] = [];
    if (outputPath && outputPath.startsWith(root + path.sep)) {
      exclude.push(path.relative(root, outputPath).split(path.sep).join('/'));
    } else if (!outputPath) {
      // Nothing is written, but the conventional filename is still excluded so
      // `manifest --output` and plain `manifest` agree about the content id.
      exclude.push(DEFAULT_MANIFEST_NAME);
    }

    const manifest = buildManifest({ root, exclude });
    const serialised =
      options.format === 'text' ? renderManifestText(manifest) : serialiseManifest(manifest);

    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, serialised, 'utf8');

      if (options.json) {
        printJson({
          ok: true,
          command: 'pocket manifest',
          output: outputPath,
          fileCount: manifest.fileCount,
          totalBytes: manifest.totalBytes,
          contentId: manifest.contentId,
        });
        return EXIT_CODES.OK;
      }
      printLine(`Wrote ${outputPath}`);
      renderTable([
        ['files', String(manifest.fileCount)],
        ['bytes', String(manifest.totalBytes)],
        ['content id', manifest.contentId],
      ]);
      return EXIT_CODES.OK;
    }

    process.stdout.write(serialised);
    return EXIT_CODES.OK;
  });
}

// --- 5. diff ----------------------------------------------------------------

export interface DiffCommandOptions {
  before: string;
  after: string;
  showUnchanged: boolean;
  json: boolean;
}

export function runPocketDiff(options: DiffCommandOptions): ExitCode {
  return guard(options.json, 'pocket diff', () => {
    const diff = diffReleases({
      before: options.before,
      after: options.after,
      includeUnchanged: options.showUnchanged,
    });
    const differs = hasDifferences(diff);

    if (options.json) {
      printJson({ ok: !differs, command: 'pocket diff', ...diff });
      return differs ? EXIT_CODES.VALIDATION_FAILED : EXIT_CODES.OK;
    }

    printLine(`${diff.before.name}  ->  ${diff.after.name}`);
    printLine();
    renderTable([
      ['added', String(diff.counts.added)],
      ['removed', String(diff.counts.removed)],
      ['modified', String(diff.counts.modified)],
      ['renamed (likely)', String(diff.counts.renamed)],
      ['case-only changes', String(diff.counts.caseOnly)],
      ['unchanged', String(diff.counts.unchanged)],
      ['size change', formatDelta(diff.byteDelta)],
    ]);
    printLine();

    for (const change of diff.added) printLine(`  + ${change.path}`);
    for (const change of diff.removed) printLine(`  - ${change.path}`);
    for (const change of diff.modified) printLine(`  M ${change.path}`);
    for (const rename of diff.renameCandidates) {
      printLine(`  R ${rename.from}  ->  ${rename.to}`);
    }
    for (const change of diff.caseOnlyChanges) {
      const suffix = change.contentAlsoChanged ? '  (contents changed too)' : '';
      printLine(`  C ${change.from}  ->  ${change.to}${suffix}`);
    }
    if (options.showUnchanged) {
      for (const change of diff.unchanged) printLine(`    ${change.path}`);
    }

    printLine();
    if (!differs) {
      printLine('No differences.');
      return EXIT_CODES.OK;
    }
    if (diff.counts.renamed > 0) {
      printLine('Renames are guesses based on identical contents, not recorded moves.');
    }
    return EXIT_CODES.VALIDATION_FAILED;
  });
}

// --- 6. path ----------------------------------------------------------------

export interface PathCommandOptions {
  project: string;
  file: string;
  form?: string;
  copy: boolean;
  json: boolean;
}

export function runPocketPath(options: PathCommandOptions): ExitCode {
  return guard(options.json, 'pocket path', () => {
    if (options.form !== undefined && !isPathFormName(options.form)) {
      throw new PocketToolError(
        `Unknown path form "${options.form}".`,
        'Choose one of: windows, posix, ini, lua.',
      );
    }
    const form: PathFormName = (options.form as PathFormName | undefined) ?? 'windows';

    const result = projectPath({ project: options.project, target: options.file });
    const selected = result[form];

    const clipboard = options.copy ? copyToClipboard(selected) : undefined;

    if (options.json) {
      printJson({
        ok: true,
        command: 'pocket path',
        project: result.project,
        form,
        value: selected,
        windows: result.windows,
        posix: result.posix,
        ini: result.ini,
        lua: result.lua,
        notes: result.notes,
        // Deliberately reports whether the copy happened without making the
        // command's success depend on it.
        clipboard: clipboard ? { copied: clipboard.copied, detail: clipboard.detail } : null,
      });
      return EXIT_CODES.OK;
    }

    if (options.form !== undefined) {
      // An explicit form is for piping and pasting: print the value alone.
      printLine(selected);
    } else {
      renderTable([
        ['windows', result.windows],
        ['posix', result.posix],
        ['ini key', result.ini],
        ['lua string', result.lua],
      ]);
    }

    // Notes and the clipboard confirmation go to stderr, so
    // `sah pocket path … --form windows` can be piped or captured and yield
    // exactly the path and nothing else.
    for (const note of result.notes) printError(`note: ${note}`);
    if (clipboard) {
      printError(
        clipboard.copied
          ? `Copied to the clipboard (${form} form).`
          : `Not copied: ${clipboard.detail}`,
      );
    }
    return EXIT_CODES.OK;
  });
}

// --- shared formatting ------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDelta(bytes: number): string {
  const sign = bytes > 0 ? '+' : bytes < 0 ? '-' : '';
  return `${sign}${formatBytes(Math.abs(bytes))}`;
}
