/**
 * SHAR Pocket Tools — six small utilities for the part of modding that is not
 * authoring: cleaning, comparing and preparing mod folders.
 *
 * Four properties hold across all six, and they are the point of the package:
 *
 * 1. **Offline.** Nothing here opens a network connection.
 * 2. **Read-only by default.** Only `clean-export` writes, and it writes a
 *    *copy* — deleting from the original needs an explicit flag and an explicit
 *    confirmation.
 * 3. **Confined.** Symlinks are never followed, `..` never escapes, and nothing
 *    outside the folder the user named is ever read.
 * 4. **No game knowledge.** These operate on files, INI keys and hashes. They
 *    make no claim about Springfield, which is why they are useful today while
 *    the location and vehicle registries are still empty — and why none of them
 *    can tell you whether a mod works in the game.
 *
 * Every function here is a plain call taking plain data, so a future
 * drag-and-drop macOS front end can use them without going through the CLI.
 */
export * from './errors.js';
export * from './scan.js';
export * from './junk.js';
export * from './references.js';
export * from './ini.js';

export * from './case-check.js';
export * from './clean-export.js';
export * from './conflicts.js';
export * from './manifest.js';
export * from './release-diff.js';
export * from './project-path.js';
