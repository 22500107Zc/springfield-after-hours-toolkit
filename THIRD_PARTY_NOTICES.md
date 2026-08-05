# Third-party notices

This repository's original code and data are MIT licensed (see [LICENSE](LICENSE)).

**This repository vendors no third-party code and distributes no third-party
assets.** Everything below is either a runtime npm dependency, an upstream
project fetched on demand into a git-ignored directory, or a compatibility
target that users supply themselves.

---

## What this repository will never contain

- The game _The Simpsons: Hit & Run_, in whole or in part
- Game assets of any kind — models, textures, audio, video, map data, scripts
- Dialogue audio extracted from the game
- Proprietary map files
- Assets from Fully Connected Map, Full Game Plus, or any other community mod
- API keys, tokens or other credentials

CI enforces the asset and credential rules on every push (`.github/workflows/ci.yml`,
job `hygiene`).

---

## Upstream projects fetched on demand

These are **not committed here**. `npm run upstream:fetch` downloads them from
pinned commits into `vendor/`, which is git-ignored, and verifies each file
against a SHA-256 recorded in [`data/upstream/upstream.lock.json`](data/upstream/upstream.lock.json).
Licence files are always fetched alongside the code.

### donutteam/game-lua — MIT

> Copyright (c) 2022 Donut Team

- Repository: <https://github.com/donutteam/game-lua>
- Pinned commit: `74f8059127bcd9555e6417d9b0b4f5dcef5b9a22`
- Role: **runtime**. Ships inside a built mod at `Resources/lib/Game.lua`.
  Generated mission scripts call into the `Game` table it defines.

This toolkit additionally **derives metadata** from `src/Game.lua`. The
`DefaultCommands`, `ASFCommands` and `DebugTestCommands` tables in that file are
the source of every record in `data/registries/commands.yaml` — each command's
name, minimum and maximum argument counts, required scope, opened scope and
conditional flag.

That derived file contains factual metadata about the game's scripting
interface, not upstream source code, and it carries a header naming the
repository, commit and file hash it was derived from. Regenerate it with
`npm run registry:derive-commands`; CI verifies it has not drifted.

### donutteam/lucas-mod-launcher-lua — MIT

> Copyright (c) Donut Team

- Repository: <https://github.com/donutteam/lucas-mod-launcher-lua>
- Pinned commit: `bddad4be6e9896252114417c3e98903f25e8ace6`
- Role: **development only**. Lua Language Server definitions for Custom Files
  Lua functions.

These are **editor type definitions, not a runtime library.** They provide
autocompletion and documentation while writing Lua; they are not code the game
executes, and they must never be treated as such. Upstream recommends placing
them at `Resources/lib/external/lucas-mod-launcher-lua` and configuring
`"Lua.runtime.version": "Lua 5.3"`.

---

## Upstream projects referenced but not used

### donutteam/pure3d-ts — MIT

- Repository: <https://github.com/donutteam/pure3d-ts>
- Pinned commit: `b1c7043d899ee27751a777bcd03d1d936a818a00`
- Role: **planned**. Recorded as a future adapter boundary only.

No package in this repository depends on it. Pure3D support is deliberately out
of scope for the foundation: writing destructive P3D transformations without
fixtures to test against would be reckless. See [ROADMAP.md](ROADMAP.md).

### donutteam/mfk-to-lua — GPL-3.0

- Repository: <https://github.com/donutteam/mfk-to-lua>
- Pinned commit: `6e19e7f78104877146bbc30d267d43d9da896c54`
- Role: **external tool**.

**Licensing note.** This project is GPL-3.0, while this repository is MIT. No
code from `mfk-to-lua` is used, linked, derived from, or vendored here, and none
will be without a deliberate and documented licensing decision. It is referenced
only as a separate tool a user may choose to run themselves, so this
repository's MIT licence is unaffected.

---

## Documentation cited

Donut Team's documentation at <https://docs.donutteam.com> is the source for
most registry records. It is **cited, not reproduced**: the registries record
identifiers and their meanings — facts about how the game works — along with a
URL and retrieval date for each claim. See
[`data/provenance/sources.yaml`](data/provenance/sources.yaml) for the full list.

Documentation content remains © Donut Team.

---

## Compatibility targets (user-supplied)

Neither of these is bundled, mirrored, extracted or redistributed. The toolkit
lets a campaign _declare_ that it targets them, and can read a user's own
installation if the user explicitly points at it.

- **Fully Connected Map** — profile status `unverified`, with no map ids,
  locators or locator mappings recorded. Populating it requires someone with the
  mod installed to inspect it and record findings with provenance. Its assets
  must never be copied into this repository.
- **Full Game Plus** — profile status `unverified`. Recorded so campaigns can
  declare the target; no behavioural claims are made.

See [`data/registries/compatibility-profiles.yaml`](data/registries/compatibility-profiles.yaml).

---

## npm dependencies

Runtime dependencies retain their own licences, recorded in `package-lock.json`
and installed into `node_modules`. The direct ones are:

| Package                     | Licence | Used for                                  |
| --------------------------- | ------- | ----------------------------------------- |
| `@modelcontextprotocol/sdk` | MIT     | the local MCP server                      |
| `@anthropic-ai/sdk`         | MIT     | optional AI integration only              |
| `zod`                       | MIT     | runtime schema validation                 |
| `commander`                 | MIT     | CLI argument parsing                      |
| `yaml`                      | ISC     | reading authored documents and registries |

Development dependencies (TypeScript, ESLint, Prettier, Vitest and their
transitive dependencies) are likewise governed by their own licences.

Run `npm ls --all` for the complete tree, or `npx license-checker` for a full
licence report.

---

## Adding a dependency

Every external dependency must be recorded here before it is merged. For an
upstream project that is fetched rather than installed from npm, also add it to
`data/upstream/upstream.lock.json` with a pinned commit and per-file SHA-256, and
preserve its licence file.

GPL-licensed projects must remain external tools or isolated GPL-compatible
components unless the licensing consequences are deliberately accepted and
documented here.
