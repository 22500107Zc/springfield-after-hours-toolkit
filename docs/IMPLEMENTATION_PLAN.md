# Implementation Plan

Status: **living document**. Written at the start of the foundation session and
updated as decisions were made. Where a decision was made for expedience rather
than on principle, that is stated.

## 1. What this repository is

An open, reusable toolkit for authoring story-driven campaigns for _The
Simpsons: Hit & Run_ that run under **Lucas' Simpsons: Hit & Run Mod Launcher**.
"Springfield After Hours" is the flagship campaign, but it is _an example inside
the repository_, not the point of the repository.

The toolkit's job is to turn readable YAML into a valid Mod Launcher mod folder,
and to refuse to do so when the campaign references game content that has not
been verified to exist.

## 2. Non-negotiable constraint that shapes everything

**The toolkit must not invent game facts.**

This is not a documentation footnote — it is the central architectural driver.
It is why there is a registry layer at all, why every registry record carries a
provenance reference and a verification status, and why an unknown reference is
a _build error_ rather than a warning.

Practically:

- A campaign may reference `java-server` as a destination.
- The toolkit has **no verified record** of a locator for the Java Server.
- Therefore `sah build` fails with `SAH2001 unresolved-locator`, and the
  Springfield After Hours example ships in that state on purpose.

This is the correct behaviour, and the flagship example is deliberately used to
demonstrate it rather than to hide it.

## 3. Research performed before writing code

All of the following were fetched and read during this session. Full detail,
including URLs and retrieval dates, is in [`RESEARCH_LOG.md`](./RESEARCH_LOG.md).

| Source                                                            | What it established                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs.donutteam.com` → Configuring Mods                           | The complete documented `Meta.ini` key set, section by section                                                                                          |
| `docs.donutteam.com` → Custom Files hack                          | `CustomFiles.ini` sections (`[Miscellaneous]`, `[PathRedirections]`, `[PathHandlers]`, `[AdditionalFiles]`), folder layout, `CustomFiles.lua` semantics |
| `docs.donutteam.com` → All Console Script Commands                | The authoritative command list, with scope categories and `Unused`/`Commented` markers                                                                  |
| `docs.donutteam.com` → All Objectives / All Conditions            | The 20 base objective types, 15 base condition types, plus the Additional Script Functionality additions                                                |
| `docs.donutteam.com` → Characters                                 | The default dialogue character codes (`Brt` → `bart`, `Cbg` → `cbg`, …) and outfit assignments                                                          |
| `docs.donutteam.com` → Action Event Locator Types, Dyna Load Data | Locator type names; dyna-load symbol table                                                                                                              |
| `github.com/donutteam/game-lua`                                   | README, MIT licence, and `src/Game.lua` — which encodes every command's `MinArgs`, `MaxArgs`, `RequiresScope`, `OpensScope`, `Conditional`              |
| `github.com/donutteam/lucas-mod-launcher-lua`                     | Lua Language Server definitions; Lua 5.3 configuration guidance                                                                                         |

The single most valuable find was **`src/Game.lua`'s command tables**. They give
machine-readable arity and scope rules for ~400 commands. The toolkit derives its
command registry from them rather than hand-transcribing (and therefore
corrupting) the list.

## 4. Architecture

An npm-workspaces monorepo. Each package has one job and depends only on layers
below it.

```
core          types, diagnostics, provenance, safe paths, config, platform
schemas       Zod schemas for every authored document + registry record
registry      loads data/registries/*.yaml, indexes, searches
validator     campaign/mission/dialogue rules -> diagnostics
adapter-game-lua        Game.* emission, command metadata, scope tracking
adapter-lucas-launcher  Meta.ini / CustomFiles.ini / CustomFiles.lua emitters
compiler      validate -> generate -> manifest (deterministic)
plugin-sdk    typed plugin contribution interface
ai            OPTIONAL Anthropic integration (propose -> parse -> validate -> confirm)
mcp-server    MCP tools over the toolkit, sandboxed
cli           the `sah` binary
```

Dependency direction is strictly downward. `compiler` never imports `cli`;
`registry` never imports `validator`.

### Why a separate `adapter-game-lua`

Upstream `Game.lua` is a _runtime_ Lua library that ships **inside the user's
mod**. The toolkit generates Lua that calls into it. Isolating that behind an
adapter means an upstream change alters one package, not the whole toolkit, and
it keeps the licensing boundary explicit.

### What is deliberately NOT built yet

- **Pure3D editing.** `pure3d-ts` is recorded as a planned adapter with a typed
  boundary only. Writing destructive P3D transforms without fixtures would be
  reckless.
- **A plugin _loader_.** The typed interface exists; automatic execution of
  third-party code does not. Documented as a security boundary, not an oversight.
- **Any GUI.** Core and CLI first, so a future editor consumes the same APIs.

## 5. Key technical decisions

| Decision                                         | Rationale                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript pinned to `~5.9.3`, not 7.x           | `typescript-eslint@8` declares `typescript >=4.8.4 <6.1.0`. Adopting TS 7 would mean shipping a repo whose own lint task cannot run. Revisit when the plugin supports it.                               |
| ESM + `NodeNext` throughout                      | Matches Node 20+, the MCP SDK and the Anthropic SDK. Relative imports carry explicit `.js` extensions.                                                                                                  |
| Zod 4 for runtime validation                     | The MCP SDK accepts `zod@^3.25 \|\| ^4.0`, so one validation library covers both authored documents and MCP tool schemas.                                                                               |
| `tsc --build` project references                 | Enforces the layering above at compile time and gives correct build ordering for free.                                                                                                                  |
| Vitest aliases packages to `src`                 | `npm test` works on a clean checkout without a build step first.                                                                                                                                        |
| Build output excludes wall-clock time by default | Determinism is a stated requirement; a timestamp would break byte-identical rebuilds. Opt in with `--include-timestamp`.                                                                                |
| Upstream Lua is **fetched**, never vendored      | `scripts/upstream/fetch-upstream.mjs` downloads pinned commits into git-ignored `vendor/`. Keeps the repo free of third-party code while remaining reproducible via `data/upstream/upstream.lock.json`. |

## 6. Verification vocabulary

Every registry record and every capability carries exactly one status:

- `verified` — proven by official documentation or upstream source, with a
  provenance reference.
- `experimental` — implemented here but not confirmed against a real game.
- `community-reported` — asserted by a community source, not independently checked.
- `unverified` — recorded as a name only; semantics unknown.
- `unsupported` — known not to work.
- `planned` — intended, not implemented.

`sah build` accepts `verified` and `experimental` references. Everything else is
an error unless the campaign explicitly opts in per-reference, which is then
stamped into the build manifest.

## 7. Build order followed in this session

1. Workspace, tooling, licence, ignore rules. ✅
2. `core` — diagnostics, provenance, safe paths, config, platform. ✅
3. `schemas` — campaign / mission / dialogue / preset / compatibility / registry. ✅
4. `registry` + seeded `data/registries/*.yaml` with provenance. ✅
5. `validator` — reference resolution, duplicates, path safety, scope rules. ✅
6. `adapter-game-lua`, `adapter-lucas-launcher`, `compiler`. ✅
7. `cli`. ✅
8. `mcp-server`. ✅
9. `ai` (optional, key-gated). ✅
10. Examples, fixtures, tests, CI, documentation. ✅

## 8. Honest limitations at the end of the foundation session

These are stated plainly rather than buried:

- **Nothing here has been run against the actual game.** No contributor to this
  session had a game installation, a Mod Launcher installation, or Windows. The
  generated `Meta.ini` / `CustomFiles.ini` / mission Lua match the documented
  formats, and the mission Lua is checked against Game.lua's own arity and scope
  tables — but "matches the documentation" is not "loads in the game".
- **The Springfield After Hours example does not build.** It is story data whose
  locations and locators are unverified, and it fails validation by design.
  `examples/minimal-campaign` is the one that compiles.
- **Vehicle registry is empty.** The Honor Roller's internal name was not found
  in any source read this session, so it was not guessed.
- **Night presets are design manifests.** Every setting carries its own support
  status; most are `planned` or `unverified`. No preset is claimed to work.
- **Fully Connected Map profile is a stub** with status `requires-verification`
  and no locations or locators.

## 9. Next milestone

Registry expansion driven by real, citable sources — specifically locators and
vehicle internal names — so that a mission can move from "compiles" to
"plausibly playable", followed by first in-game verification on a Windows
machine with a legally owned copy of the game.
