# SHAR Pocket Tools

Six tiny, cross-platform utilities for cleaning, comparing and preparing
_The Simpsons: Hit & Run_ mod folders — **no game installation required.**

They are aimed at the part of modding that is not authoring: the folder you are
about to zip up, the two mods you are not sure play nicely together, the release
you want to diff against the last one, the path you need to paste into a
`CustomFiles.ini` with the backslashes doubled correctly.

macOS is the primary experience. Everything works on Windows and Linux too.

> **These tools inspect and prepare files. They do not prove a mod works
> in-game.** Nothing here loads the game, parses game data, or knows what
> Springfield contains. A folder that passes every check below can still be a
> completely broken mod. Ask them about files, and they answer about files.

---

## Contents

- [Install](#install)
- [The six tools](#the-six-tools)
  - [1. `case-check`](#1-sah-pocket-case-check)
  - [2. `clean-export`](#2-sah-pocket-clean-export)
  - [3. `conflicts`](#3-sah-pocket-conflicts)
  - [4. `manifest`](#4-sah-pocket-manifest)
  - [5. `diff`](#5-sah-pocket-diff)
  - [6. `path`](#6-sah-pocket-path)
- [Exit codes](#exit-codes)
- [JSON output](#json-output)
- [Safety behaviour](#safety-behaviour)
- [macOS clipboard](#macos-clipboard)
- [Limitations](#limitations)
- [How this was built](#how-this-was-built)

---

## Install

Requires **Node.js 20 or newer**. Nothing else — no game, no Mod Launcher, no
network access at any point.

```sh
git clone https://github.com/22500107Zc/springfield-after-hours-toolkit.git
cd springfield-after-hours-toolkit
npm install
npm run build
```

Then either use the full path:

```sh
node packages/cli/dist/bin.js pocket --help
```

…or make `sah` available as a command:

```sh
npm link -w packages/cli
sah pocket --help
```

The rest of this page writes `sah`. Substitute
`node packages/cli/dist/bin.js` if you skipped `npm link`.

**Dragging a folder in.** On macOS you can type `sah pocket case-check ` and
then drag a folder from Finder onto the Terminal window — it inserts the path,
correctly quoted. Every command here accepts a path that way.

---

## The six tools

### 1. `sah pocket case-check`

**Finds paths that differ only by letter case, and references whose casing does
not match the real file.**

macOS and Windows are usually case-insensitive. Linux is not, and neither is the
inside of a zip file. So a mod that works perfectly on your Mac can break for
someone else in two ways that are invisible locally:

- `Scripts/main.lua` and `scripts/main.lua` are one file on your machine and two
  in the archive you upload;
- a file that says `Resources/Scripts/M0I.lua` when the file on disk is
  `Resources/scripts/m0i.lua` resolves fine for you and not for them.

```sh
sah pocket case-check ~/mods/my-mod
```

```console
Checked 11 files in /Users/you/mods/my-mod
Read 4 text files looking for path references.

References whose casing does not match the file (1):
  README.txt:1:5
    written:  Resources/Scripts/M0I.lua
    actual:   Resources/scripts/m0i.lua
    suggest:  Resources/scripts/m0i.lua

Nothing has been changed. Fix these by renaming files or editing the references.
```

It reads these plain-text formats: `.ini`, `.lua`, `.mfk`, `.con`, `.txt`,
`.json`, `.yaml`, `.yml`. Binary game data is never opened.

**It will not flood you with false positives.** A word is only ever considered a
possible path if it contains a slash or ends in an extension a mod actually uses
— and even then it is reported only when the exact path does **not** exist and a
differently-cased one **does**. Prose about Springfield produces no output,
because "Springfield" matches no file under any casing.

| Flag              | Effect                                          |
| ----------------- | ----------------------------------------------- |
| `--no-references` | Check filenames only; do not open any text file |
| `--json`          | Machine-readable output                         |

Alias: `sah pocket case`.

---

### 2. `sah pocket clean-export`

**Copies a mod folder without the junk macOS leaves in it.**

Zip a mod on a Mac and it ships with a `.DS_Store` beside every asset, an
AppleDouble `._twin` for every file, and often a whole `__MACOSX` tree.

**The default operation copies. It does not delete.** Run it with no destination
to preview:

```sh
sah pocket clean-export ~/mods/my-mod
```

```console
Found 5 junk items (43 B):
  .DS_Store  — macOS Finder folder-view settings
  .m0i.lua.swp  — Vim swap file
  Resources/.DS_Store  — macOS Finder folder-view settings
  Resources/._bench.p3d  — AppleDouble resource fork
  __MACOSX/  — resource forks added when Finder made a zip

6 other files would be kept.

Nothing has been changed. To make a clean copy:
  sah pocket clean-export "my-mod" <destination>
```

Then write the clean copy:

```sh
sah pocket clean-export ~/mods/my-mod ~/Desktop/my-mod-release
```

```console
Clean copy written to /Users/you/Desktop/my-mod-release

  files copied      6
  links recreated   0
  junk left behind  5 items, 43 B

The original folder was not modified.
```

Zip **that** folder, not the original.

**What counts as junk** is a fixed, closed list: `.DS_Store`, `._*` AppleDouble
files, `__MACOSX`, `.Spotlight-V100`, `.Trashes`, `.fseventsd`, `.AppleDouble`,
Vim swap and undo files, Emacs autosave and lock files, `*~` backups, `.bak`,
`.orig`, `.rej`, `.tmp`, partial downloads, and the Windows equivalents
(`Thumbs.db`, `desktop.ini`).

Two things are pointedly **not** junk:

- **Hidden files in general.** `.gitignore`, `.editorconfig` and `.luarc.json`
  are all hidden and all source. Being hidden is not evidence of being
  disposable.
- **Anything your `.gitignore` excludes.** Ignored is not the same as
  disposable.

If a name is not on the list, these tools leave it alone.

#### Deleting from the original

Possible, but it takes two explicit flags and it is never the default:

```sh
sah pocket clean-export ~/mods/my-mod --in-place --yes
```

Without `--yes` it prints the preview and refuses. Every deletion is
re-verified immediately before it happens — the name must still be on the junk
list and the path must still be inside the folder you named — so nothing that
changes underneath the tool can redirect a removal.

| Flag         | Effect                                             |
| ------------ | -------------------------------------------------- |
| `--in-place` | Delete from the original instead of copying        |
| `--yes`      | Confirm an `--in-place` deletion (required)        |
| `--force`    | Allow writing into a destination that is not empty |
| `--json`     | Machine-readable output                            |

Alias: `sah pocket clean`.

---

### 3. `sah pocket conflicts`

**Reports paths supplied by more than one mod.**

```sh
sah pocket conflicts ~/mods/night-shift ~/mods/late-night
```

```console
Compared 2 mods:
  Night Shift  11 files, 1 claimed game paths
  Late Night   4 files, 1 claimed game paths

Potential file conflicts (3):

  [exact-path] Resources/art/bench.p3d
    every copy is byte-identical
    Night Shift: Resources/art/bench.p3d  9b00b4169bf6358d…
    Late Night: Resources/art/bench.p3d  9b00b4169bf6358d…

  [game-path] scripts/missions/level01/m0i.mfk
    Night Shift: CustomFiles.ini
    Late Night: CustomFiles.ini

  [internal-name] nightshift
    Night Shift: Meta.ini
    Late Night: Meta.ini

These are potential conflicts, not proven ones. This tool compares
files; it does not know what the game or the Mod Launcher does when
two mods supply the same path.
```

Four kinds of overlap are reported:

| Kind                    | Meaning                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `exact-path`            | The same relative path exists in more than one mod            |
| `case-insensitive-path` | Paths that collide once case is ignored                       |
| `game-path`             | The same game path claimed in more than one `CustomFiles.ini` |
| `internal-name`         | The same `InternalName` in more than one `Meta.ini`           |

Every file overlap carries a SHA-256 per copy, so "both mods ship this file" is
distinguishable from "both mods ship a _different_ version of this file".

Each mod's own `Meta.ini`, `CustomFiles.ini` and `CustomFiles.lua` are excluded
from file comparison: every mod has one, so reporting them would fire on every
comparison and bury the overlaps that matter.

> **"Potential" is doing real work in that phrase.** This tool does not predict
> what the game or the Mod Launcher does when two mods overlap. Load order and
> override behaviour are not documented in any source this toolkit has verified.
> Two mods that overlap may work together perfectly; two mods that do not
> overlap at all may still break each other. Files are all this compares.

Accepts two or more folders.

---

### 4. `sah pocket manifest`

**Records every file, its size and its SHA-256 — deterministically.**

```sh
sah pocket manifest ~/mods/my-mod --format text
```

```console
my-mod
6 files, 299 bytes
content id 7fd9f5e5b8e31845a0ce5e323348a926ae095381a8e1ddd2e23b9d6a2eb6949c

181314065df2f2fd…           7  .gitignore
98fc2fc4a546fb6a…          77  CustomFiles.ini
e8eecb706c5ae4e0…          58  Meta.ini
b1f782ce9768f305…          95  README.txt
9b00b4169bf6358d…          17  Resources/art/bench.p3d
f95a277aa517e0a3…          45  Resources/scripts/m0i.lua
```

Save one next to a release so you can prove later what you shipped:

```sh
sah pocket manifest ~/mods/my-mod --output ~/mods/my-mod/manifest.json
```

**Two runs over unchanged files produce byte-identical output**, on any machine
and any platform. That needs four deliberate choices:

- no timestamps anywhere in the file;
- paths recorded POSIX-style, so a Windows run matches a macOS run;
- sorting by code unit rather than locale, so different ICU builds cannot
  reorder;
- **the manifest excludes itself**, so writing it into the folder it describes
  does not change what the next run describes.

The `contentId` is a single SHA-256 over every path and hash — one string that
identifies the whole file set.

**Symlinks are recorded, never followed.** They are listed separately with their
target text, and they are not part of `contentId`. A link's target may be
outside the folder or may not exist, and hashing through one would let a
manifest describe files that are not in the mod at all.

| Flag                  | Effect                            |
| --------------------- | --------------------------------- |
| `-o, --output <file>` | Write to a file instead of stdout |
| `--format json\|text` | Output shape (default `json`)     |

---

### 5. `sah pocket diff`

**Shows what actually changed between two releases.** Either side may be a
folder or a manifest.

```sh
sah pocket diff ~/releases/v1 ~/releases/v2
```

```console
v1  ->  v2

  added              2
  removed            2
  modified           1
  renamed (likely)   1
  case-only changes  0
  unchanged          3
  size change        +18 B

  + CHANGELOG.txt
  + Resources/props/bench.p3d
  - .gitignore
  - Resources/art/bench.p3d
  M Resources/scripts/m0i.lua
  R Resources/art/bench.p3d  ->  Resources/props/bench.p3d

Renames are guesses based on identical contents, not recorded moves.
```

Beyond added/removed/modified it reports two things a plain listing misses:

- **Rename candidates** — a file whose contents are unchanged but whose path
  moved. Called _candidates_ because identical content at two paths is evidence,
  not proof: two empty files are byte-identical and unrelated.
- **Case-only changes** — `Scripts/Main.lua` becoming `scripts/main.lua`. A real,
  shippable difference that a case-insensitive Mac will not show you.

Compare a saved manifest against what someone downloaded:

```sh
sah pocket manifest ~/releases/v2 -o /tmp/v2.json
sah pocket diff /tmp/v2.json ~/Downloads/my-mod-from-the-forum
```

File-level only. No attempt is made to diff contents — a mod is mostly binary
game data, and a byte diff of a P3D tells nobody anything.

| Flag               | Effect                                        |
| ------------------ | --------------------------------------------- |
| `--show-unchanged` | List unchanged files as well as counting them |
| `--json`           | Machine-readable output                       |

---

### 6. `sah pocket path`

**Converts a file inside a mod project into the path forms mods are written
with.**

The same path has to be written several different ways across a mod, and most of
them involve backslashes that something else will try to eat. Getting one wrong
produces a mod that loads and quietly does nothing.

```sh
sah pocket path ~/mods/my-mod Resources/scripts/m0i.lua
```

```console
  windows     Resources\scripts\m0i.lua
  posix       Resources/scripts/m0i.lua
  ini key     Resources\\scripts\\m0i.lua
  lua string  "Resources\\scripts\\m0i.lua"
```

| Form      | Where it goes           |
| --------- | ----------------------- |
| `windows` | Game and Launcher paths |
| `posix`   | Anything cross-platform |
| `ini`     | A `CustomFiles.ini` key |
| `lua`     | A Lua string literal    |

Ask for one form and it prints that alone, so it can be piped or captured:

```sh
sah pocket path ~/mods/my-mod Resources/scripts/m0i.lua --form ini
```

```console
Resources\\scripts\\m0i.lua
```

**Output is always project-relative.** An absolute path is never returned or
copied — `/Users/yourname/…` pasted into a public forum tells strangers your
name, and it will not work on anyone else's machine either. Anything outside the
project is refused rather than converted:

```console
That path is outside the project folder you selected.
Project: /Users/you/mods/my-mod
Path:    /Users/you/mods/other-mod/Meta.ini
Pick a file inside the project, or select a different project folder.
```

Spaces, apostrophes and Unicode are handled, with advisory notes on stderr so
they never pollute a piped path.

| Flag            | Effect                                                 |
| --------------- | ------------------------------------------------------ |
| `--form <form>` | Print one form alone: `windows`, `posix`, `ini`, `lua` |
| `--copy`        | Also copy it to the clipboard                          |
| `--json`        | Machine-readable output                                |

---

## Exit codes

Uniform across all six tools:

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| `0`  | Ran, and found nothing to report                                  |
| `1`  | Ran, and **found something** — collisions, conflicts, differences |
| `2`  | Could not run: a path was missing, unusable, or outside scope     |
| `70` | An unexpected internal error                                      |

**Code 1 is a finding, not a failure.** `sah pocket diff` returns 1 whenever two
releases differ, which is the normal case. In a shell script:

```sh
if sah pocket case-check ./my-mod; then
  echo "no case problems"
else
  case $? in
    1) echo "found something — see the output above" ;;
    *) echo "could not run" ;;
  esac
fi
```

---

## JSON output

Every command takes `--json`. The envelope is the same everywhere:

```json
{
  "ok": false,
  "command": "pocket case-check",
  "...": "tool-specific fields"
}
```

`ok` mirrors the exit code: `true` for 0, `false` for anything else. Errors come
back as `{"ok": false, "command": "…", "error": "…", "hint": "…"}`.

<details>
<summary><code>pocket case-check --json</code></summary>

```json
{
  "ok": false,
  "command": "pocket case-check",
  "filesScanned": 11,
  "textFilesRead": 4,
  "collisions": [
    {
      "lowercased": "scripts/main.lua",
      "paths": ["Scripts/Main.lua", "scripts/main.lua"],
      "type": "file"
    }
  ],
  "references": [
    {
      "file": "README.txt",
      "line": 1,
      "column": 5,
      "referenced": "Resources/Scripts/M0I.lua",
      "actual": "Resources/scripts/m0i.lua",
      "suggestion": "Resources/scripts/m0i.lua"
    }
  ],
  "skipped": [{ "path": "link.lua", "reason": "symbolic link — not followed" }]
}
```

</details>

<details>
<summary><code>pocket clean-export --json</code></summary>

```json
{
  "ok": true,
  "command": "pocket clean-export",
  "mode": "export",
  "destination": "/Users/you/Desktop/my-mod-release",
  "copied": 6,
  "linked": 0,
  "junkExcluded": [
    {
      "path": ".DS_Store",
      "kind": "ds-store",
      "why": "macOS Finder folder-view settings",
      "type": "file",
      "bytes": 6
    }
  ],
  "junkBytes": 43,
  "symlinks": [],
  "errors": []
}
```

`mode` is `preview`, `export` or `in-place`.

</details>

<details>
<summary><code>pocket conflicts --json</code></summary>

```json
{
  "ok": false,
  "command": "pocket conflicts",
  "mods": [
    {
      "folder": "night-shift",
      "name": "Night Shift",
      "internalName": "NightShift",
      "fileCount": 11,
      "claimedGamePaths": ["scripts/missions/level01/m0i.mfk"],
      "notes": []
    }
  ],
  "counts": { "exact-path": 1, "case-insensitive-path": 0, "game-path": 1, "internal-name": 1 },
  "potentialConflicts": [
    {
      "kind": "exact-path",
      "subject": "Resources/art/bench.p3d",
      "identical": true,
      "participants": [
        { "mod": "Night Shift", "where": "Resources/art/bench.p3d", "sha256": "9b00…", "bytes": 17 }
      ]
    }
  ]
}
```

</details>

<details>
<summary><code>pocket manifest</code> (the manifest file itself)</summary>

```json
{
  "contentId": "7fd9f5e5b8e31845a0ce5e323348a926ae095381a8e1ddd2e23b9d6a2eb6949c",
  "fileCount": 6,
  "files": [{ "bytes": 7, "path": ".gitignore", "sha256": "181314065df2f2fd…" }],
  "format": "shar-pocket-manifest",
  "name": "my-mod",
  "skipped": [],
  "symlinks": [{ "dangling": false, "escapes": false, "path": "alias.txt", "target": "real.txt" }],
  "totalBytes": 299,
  "version": 1
}
```

Keys are sorted at every level. `format` and `version` are checked when the file
is read back, so an unrelated JSON file is rejected rather than silently treated
as an empty manifest.

</details>

<details>
<summary><code>pocket diff --json</code></summary>

```json
{
  "ok": false,
  "command": "pocket diff",
  "before": { "name": "v1", "fileCount": 6, "totalBytes": 299, "contentId": "7fd9…" },
  "after": { "name": "v2", "fileCount": 6, "totalBytes": 317, "contentId": "22aa…" },
  "identical": false,
  "counts": {
    "added": 2,
    "removed": 2,
    "modified": 1,
    "unchanged": 3,
    "renamed": 1,
    "caseOnly": 0
  },
  "added": [{ "path": "CHANGELOG.txt", "kind": "added", "afterBytes": 9, "afterSha256": "…" }],
  "removed": [],
  "modified": [],
  "renameCandidates": [
    {
      "from": "Resources/art/bench.p3d",
      "to": "Resources/props/bench.p3d",
      "bytes": 17,
      "sha256": "…"
    }
  ],
  "caseOnlyChanges": [
    { "from": "Scripts/Main.lua", "to": "scripts/main.lua", "contentAlsoChanged": false }
  ],
  "unchanged": [],
  "byteDelta": 18
}
```

</details>

<details>
<summary><code>pocket path --json</code></summary>

```json
{
  "ok": true,
  "command": "pocket path",
  "project": "my-mod",
  "form": "windows",
  "value": "Resources\\scripts\\m0i.lua",
  "windows": "Resources\\scripts\\m0i.lua",
  "posix": "Resources/scripts/m0i.lua",
  "ini": "Resources\\\\scripts\\\\m0i.lua",
  "lua": "\"Resources\\\\scripts\\\\m0i.lua\"",
  "notes": [],
  "clipboard": { "copied": true, "detail": "copied with pbcopy" }
}
```

`project` is the folder's **name**, never its absolute path.

</details>

---

## Safety behaviour

These tools are handed folders by people who may have typed, pasted or dragged
them in. The rules below hold everywhere and are enforced in one shared place
rather than repeated per tool.

**Nothing is modified by default.** Five of the six tools only read.
`clean-export` writes a _copy_; deleting from the original needs `--in-place`
**and** `--yes`.

**Symlinks are never followed.** Not for walking, not for reading, not for
copying, not for deleting. A link is recorded as a link, with its target text
and whether that target resolves outside the folder. This is what stops a link
named `.DS_Store` pointing at a real file elsewhere from getting that file
deleted.

**Nothing outside the chosen folder is ever read.** Because links are not
followed, the walk physically cannot leave. Paths supplied by the user are
checked for containment _before_ they are checked for existence, so a traversal
attempt is answered "outside the project", not "no such file" — which is both
clearer and less of a probe of the surrounding filesystem.

**Deletion is re-verified at the moment it happens.** The name must still be on
the junk list and the path must still be inside the folder. Something that
changes between the preview and the delete cannot redirect it.

**Nothing goes over the network.** There is no HTTP client in this package. No
telemetry, no uploads, no version checks.

**No shell is ever constructed from your input.** The clipboard helper is the
only place a subprocess runs, and it is invoked with an argument array and
`shell: false`, with the text passed over **stdin**. A path may legally contain
quotes, backticks, semicolons and `$(…)`; through a shell one of those becomes a
command, through stdin it is just bytes.

**Absolute paths stay out of shareable output.** Manifests record a folder's
name, not its location. `pocket path` refuses to emit one at all.

**Binary files are only ever hashed or compared byte-for-byte**, never parsed.
Only the documented plain-text extensions are opened as text, and a file
containing a NUL byte is skipped even if its extension says otherwise.

---

## macOS clipboard

```sh
sah pocket path ~/mods/my-mod Resources/scripts/m0i.lua --form ini --copy
```

The path goes to stdout; the confirmation goes to stderr, so piping still yields
exactly the path.

| Platform | Helper used                          |
| -------- | ------------------------------------ |
| macOS    | `pbcopy`                             |
| Windows  | `clip`                               |
| Linux    | `wl-copy`, then `xclip`, then `xsel` |

**Failing to copy is not failing.** On a machine with no clipboard helper the
path is still printed and the exit code is still 0:

```console
Meta.ini
Not copied: no clipboard helper worked: wl-copy (ENOENT), xclip (ENOENT), xsel (ENOENT)
```

This is the one part of these tools whose behaviour depends on the machine. Every
other output is deterministic.

---

## Limitations

Stated plainly, because the alternative is you finding out later.

- **These tools do not prove a mod works.** They inspect files. Nothing here
  loads the game, parses game data, or knows what Springfield contains. A folder
  that passes every check can still be a completely broken mod.
- **"Potential conflicts" are potential.** Load order and override behaviour are
  not documented in any source this toolkit has verified. An overlap is a thing
  to look at, not a verdict — and two mods with no overlap at all can still
  break each other.
- **Rename detection is a guess.** Identical content at two paths is evidence,
  not proof. Two empty files are byte-identical and unrelated.
- **The reference scanner is deliberately conservative.** It reports a reference
  only when the exact path is missing and a differently-cased one exists. It
  will not tell you a referenced file is missing entirely — that is a different
  problem and it refuses to guess about it. It also does not understand how any
  format resolves paths at runtime; it compares text to filenames.
- **Case-collision fixtures cannot be created on macOS or Windows.** The
  detection logic is tested with in-memory path lists on every platform, and
  additionally against real colliding files where the filesystem allows it.
- **The junk list is closed.** It will miss junk from a tool nobody has added
  yet. That is the intended trade: a broader list deletes someone's work.
- **`clean-export` copies; it does not zip.** Zipping is `zip -r`, and there is
  no reason for this tool to have an opinion about it.
- **Symlinks are not exported unless they point inside the project**, and
  recreating them may fail on Windows without developer mode. That is reported,
  not silently ignored.
- **Nothing here has been run against a real published mod by its author.**
  The fixtures are synthetic by necessity — see below.

---

## How this was built

**Written with AI assistance.** This package was implemented by Claude working
in this repository, with the design constraints, review and acceptance decisions
coming from the repository's maintainer. Every function has tests, and those
tests are the thing to trust — not the provenance of the code.

**No one who built this owns the game.** That is not an aside; it shaped the
whole package. Every one of these six tools was chosen precisely _because_ it
can be built and verified honestly without the game: they operate on files,
hashes and INI keys, so a synthetic fixture directory is a complete and faithful
test environment. Nothing here makes a claim about game behaviour, because no
such claim could have been checked.

That is also why these tools carry no verification statuses, unlike the rest of
this toolkit. There is no game fact here to verify. `sha256sum` is the same on
everyone's machine.

**The tests use synthetic fixtures only.** No game files, no Mod Launcher, no
copyrighted assets, no network. Run them with `npm test`.

---

## See also

- [Authoring guide](authoring.md) — the campaign compiler, which is a different
  and much more opinionated thing
- [Lua definitions](lua-definitions.md) — editor autocomplete for `Game.*`
- [`docs/legal/README.md`](../legal/README.md) — what this repository will never
  contain
