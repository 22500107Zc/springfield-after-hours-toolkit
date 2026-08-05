# CLAUDE.md — working rules for this repository

This is a toolkit for authoring _The Simpsons: Hit & Run_ campaigns. Its entire
value proposition is that **it does not make things up about the game.** These
rules exist to protect that.

## Hard rules

1. **Never invent game content.** Not locations, not map connections, not
   character codes, not vehicle names, not locators, not file paths, not
   scripting commands, not Mod Launcher capabilities. Ever.
2. **Search the registry before referencing anything.** Use the `search_registry`
   MCP tool or `sah registry search <kind> <query>`. If it returns nothing, the
   correct response is _"the toolkit has no verified record of this"_ — not a
   plausible-sounding guess.
3. **Validate before building.** `sah validate` first; `sah build` refuses on
   errors anyway, but do not discover that by accident.
4. **Never hand-edit generated build output.** Everything under a campaign's
   `build/` directory is regenerated. Edit the source YAML.
5. **Never expose secrets.** `ANTHROPIC_API_KEY` is read from the environment
   only. Do not print it, log it, write it to config, or include it in output.
6. **Never touch the user's game installation.** The toolkit reads nothing from
   it and writes nothing to it. A configured `gamePath` is reported by
   `sah doctor` and is otherwise off limits.
7. **Never redistribute third-party assets.** No game files, no extracted audio,
   no proprietary maps, no assets from Fully Connected Map or any other
   community mod. Upstream Lua is _fetched_, never committed.
8. **Label unsupported features honestly.** Use the verification vocabulary:
   `verified`, `experimental`, `community-reported`, `unverified`,
   `unsupported`, `planned`.
9. **Prefer deterministic toolkit functions over free-form file generation.**
   If the compiler can emit it, let the compiler emit it.

## What this game is not

Do not propose features that depend on capabilities this game does not have.
When in doubt, call `get_capability_status`.

The game has **no** day/night cycle, **no** weather system, **no** dynamic NPC
scheduling, **no** persistent open-world damage, **no** in-engine cinematic
cutscene system, and **no** runtime HTTP access. A "night campaign" is a set of
asset and lighting choices plus mission design — not a simulated clock.

The supported story format is: supported gameplay objectives, dialogue boxes,
existing character animations, and the available mission systems.

## The thing that will trip you up

Right now the registry knows **who** everyone is and **nothing about where
anything is**:

- 64 characters with verified dialogue codes (Bart is `bart`/`Brt`, Comic Book
  Guy is `cbg`/`Cbg`).
- 339 script commands with verified argument counts and scope rules.
- **Zero** locations. **Zero** vehicles. **Four** locators, all from
  documentation examples.

So a request like "make a mission where Bart drives the Honor Roller to the Java
Server" cannot be fulfilled as stated. The honest answer names exactly what is
missing and points at `examples/springfield-after-hours`, which fails validation
for precisely these reasons and is _meant_ to.

Do not resolve that tension by adding registry records. A record without a
citable source is the failure this project exists to prevent.

## Adding a registry record

Only with provenance. Every record needs a `provenance.sources` entry pointing
at a real id in `data/provenance/sources.yaml`, and that source needs a URL,
commit, or explicit statement that it is a manual observation.

`data/registries/commands.yaml` and `data/registries/characters.yaml` are
**generated**. Edit the scripts in `scripts/research/`, not the YAML. CI checks
that they still match upstream.

## Commands

```sh
npm run build          # tsc --build across the workspace
npm run typecheck      # full rebuild typecheck
npm test               # vitest
npm run lint           # eslint
npm run format:check   # prettier
npm run mcp            # start the local MCP server

node packages/cli/dist/bin.js --help    # the sah CLI, after a build
```

Do not run `npm run upstream:fetch` without saying so — it downloads pinned
upstream files into `vendor/`.

## Repository layout

```
packages/core                     diagnostics, provenance, safe paths, config
packages/schemas                  Zod schemas for every authored document
packages/registry                 loads and searches data/registries
packages/validator                campaign rules -> diagnostics
packages/adapter-game-lua         Game.* emission with scope/arity checking
packages/adapter-lucas-launcher   Meta.ini / CustomFiles.ini / CustomFiles.lua
packages/compiler                 validate -> generate -> manifest
packages/cli                      the sah binary
packages/mcp-server               sandboxed MCP tools
packages/ai                       optional Anthropic integration
packages/plugin-sdk               typed plugin contract (no loader yet)

data/registries                   verified game facts, with provenance
data/provenance/sources.yaml      the sources those facts came from
data/upstream/upstream.lock.json  pinned upstream commits + hashes
examples/minimal-campaign         the campaign that builds
examples/springfield-after-hours  the campaign that deliberately does not
fixtures/invalid                  one fixture per diagnostic class
```

Dependencies flow strictly downward. `compiler` never imports `cli`.

## Style

Match the surrounding code. Strict TypeScript, ESM with explicit `.js` import
extensions, no `any`. Comments explain constraints and decisions, not mechanics.
