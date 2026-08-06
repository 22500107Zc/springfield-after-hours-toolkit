# SHAR Pocket Tools 0.1.0

**Six tiny, cross-platform utilities for cleaning, comparing, and preparing
Simpsons: Hit & Run mod folders — no game installation required.**

Released as part of the Springfield After Hours Toolkit. Not published to npm;
build from source (see [Installing](#installing)).

---

## Announcement

> **SHAR Pocket Tools 0.1.0**
>
> Six tiny, cross-platform utilities for cleaning, comparing, and preparing
> Simpsons: Hit & Run mod folders — no game installation required.
>
> If you make mods on a Mac, you have probably shipped a `.DS_Store` or two. You
> may also have shipped a path whose casing works on your machine and nowhere
> else. These six commands catch that class of problem before you upload:
>
> - **`case-check`** — paths that differ only by case, and references whose
>   casing does not match the real file
> - **`clean-export`** — a clean copy of your mod without `.DS_Store`,
>   AppleDouble files, `__MACOSX` or editor leftovers
> - **`conflicts`** — which paths two or more mods both supply, with hashes
> - **`manifest`** — a deterministic SHA-256 record of exactly what you shipped
> - **`diff`** — what changed between two releases, including renames and
>   case-only changes
> - **`path`** — the backslashed, INI-escaped and Lua-escaped forms of a path,
>   copied to your clipboard
>
> They read by default and never touch the network. `clean-export` writes a
> _copy_; deleting from your original folder takes two explicit flags.
>
> **They inspect and prepare files. They do not prove a mod works in-game** —
> nothing here loads the game or knows what Springfield contains. That
> limitation is also the point: every feature is testable without owning the
> game, and all 196 tests for these tools run against synthetic fixtures.
>
> macOS is the primary experience; Windows and Linux are supported and tested in
> CI. Requires Node.js 20+. MIT licensed. Unofficial fan project, not affiliated
> with Electronic Arts, Disney, Fox, Radical Entertainment or Donut Team, and it
> contains no game code or assets.
>
> Docs: `docs/getting-started/pocket-tools.md`

---

## What's in this release

A new workspace package, `packages/pocket-tools`, exposed through the existing
`sah` CLI as `sah pocket <tool>`. Six tools:

| Command                                | Does                                                  |
| -------------------------------------- | ----------------------------------------------------- |
| `sah pocket case-check <dir>`          | Case collisions and mis-cased references              |
| `sah pocket clean-export <src> [dest]` | Clean copy without macOS/editor junk                  |
| `sah pocket conflicts <dir...>`        | Paths supplied by more than one mod                   |
| `sah pocket manifest <dir>`            | Deterministic path + size + SHA-256 record            |
| `sah pocket diff <old> <new>`          | Added, removed, modified, renamed, case-only          |
| `sah pocket path <project> <file>`     | Windows / POSIX / INI / Lua path forms, with `--copy` |

Aliases: `sah pocket case`, `sah pocket clean`.

### Design commitments

- **Read-only by default.** Only `clean-export` writes, and its default is a
  copy. In-place deletion requires `--in-place --yes`.
- **Deterministic.** Manifests and JSON output are byte-identical across runs
  and across platforms: no timestamps, POSIX paths, code-unit sorting, and
  manifests exclude themselves.
- **Confined.** Symlinks are never followed, containment is checked before
  existence, and nothing outside the named folder is ever read.
- **Offline.** No network client exists in the package.
- **No shell injection surface.** The clipboard helper is the only subprocess;
  it runs with an argument array, `shell: false`, and takes the text on stdin.
- **Honest about scope.** File overlaps are called _potential_ conflicts.
  Renames are called _candidates_. Neither is presented as a verdict.

### Exit codes

`0` nothing found · `1` found something · `2` could not run · `70` internal
error. Code 1 is a finding, not a failure — `diff` returns it whenever two
releases differ.

---

## Installing

Not published to npm. Build from source:

```sh
git clone https://github.com/22500107Zc/springfield-after-hours-toolkit.git
cd springfield-after-hours-toolkit
npm install
npm run build
npm link -w packages/cli     # optional; makes `sah` available

sah pocket --help
```

Requires Node.js 20 or newer. Nothing else — no game, no Mod Launcher, no
network access at any point, including during install of this package's own
dependencies (it depends only on `@sah/core` from this repository).

---

## Testing

All checks run on macOS, Windows and Linux, on Node 20 and 22.

```sh
npm run build
npm run check      # typecheck, lint, format, test, build, registry drift, examples
```

The 196 tests added for this package (across 9 test files) use synthetic fixture
directories only. No game, no Mod Launcher, no copyrighted assets, no network.
The repository total is 416 tests across 22 files.

Two host capabilities genuinely vary and are **probed rather than assumed**:

- **Case sensitivity.** macOS and Windows will not let `A.txt` and `a.txt`
  coexist, so collision fixtures cannot be created there. The detection logic is
  tested with in-memory path lists on every platform, and additionally against
  real colliding files where the filesystem allows it.
- **Symlink creation.** Windows refuses it without developer mode. Those tests
  skip on a host that cannot create links, and run everywhere else.

No test was skipped or weakened to make CI pass.

---

## Known limitations

- These tools do not prove a mod works in-game. They inspect files.
- "Potential conflicts" are potential: load order and override behaviour are not
  documented in any verified source.
- Rename detection is inference from identical hashes, not a recorded move.
- The reference scanner reports mis-_casing_ only. It will not tell you a
  referenced file is missing entirely.
- The junk list is closed and will miss junk from a tool nobody has added yet —
  the intended trade against deleting someone's work.
- Symlink recreation during export may fail on Windows without developer mode.
  This is reported, not silently ignored.
- Nothing here has been exercised against a real published mod by its author.

---

## Development disclosure

This package was implemented by Claude (Anthropic) working in this repository,
with design constraints, review and acceptance decisions from the repository's
maintainer. Every function has tests; those tests are the thing to trust.

No one who built this owns the game. That shaped the whole package: these six
tools were chosen precisely because they can be built and verified honestly
without it. Nothing here makes a claim about game behaviour, because no such
claim could have been checked.

---

## Legal

MIT licensed. Unofficial fan project — not affiliated with, endorsed by, or
sponsored by Electronic Arts, Disney, Fox, Radical Entertainment or Donut Team.

This package contains no game code, no game assets, no extracted audio, no
proprietary map files, and no assets from any community mod. It vendors no
third-party code and depends on nothing outside this repository.

See [`LICENSE`](../../LICENSE) and
[`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md).
