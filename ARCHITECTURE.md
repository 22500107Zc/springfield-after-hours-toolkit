# Architecture

## The constraint that shapes everything

**The toolkit must not invent game facts.**

That is not a documentation footnote — it is the reason for most of the design.
It explains why there is a registry layer at all, why every record carries a
provenance reference and a verification status, why unknown references are build
_errors_ rather than warnings, and why the flagship example ships in a state
where it does not compile.

The failure mode being defended against is specific. If a mission references a
locator that does not exist, _the game does not report an error_. It loads the
mission and the mission cannot be completed. The cost of catching that at build
time is a red terminal; the cost of not catching it is a playtest.

## Package graph

Dependencies flow strictly downward. Compile-time project references enforce it.

```
                          ┌──────────┐
                          │   core   │  diagnostics, provenance, safe paths,
                          └────┬─────┘  config, platform, hashing
                               │
                          ┌────▼─────┐
                          │ schemas  │  Zod schemas for authored documents
                          └────┬─────┘  and registry records
                               │
                          ┌────▼─────┐
                          │ registry │  loads data/registries, indexes, searches
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │validator │  reference resolution, duplicates,
                          └────┬─────┘  path safety, scope rules
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐  ┌──────▼───────────┐    │
    │adapter-game-lua│  │adapter-lucas-    │    │
    │                │  │launcher          │    │
    └─────────┬──────┘  └──────┬───────────┘    │
              │                │                │
              └────────┬───────┘                │
                       │                        │
                  ┌────▼─────┐                  │
                  │ compiler │                  │
                  └────┬─────┘                  │
                       │                        │
         ┌─────────────┼────────────┐           │
         │             │            │           │
    ┌────▼────┐  ┌─────▼──────┐  ┌──▼───┐  ┌────▼─────┐
    │   cli   │  │ mcp-server │  │  ai  │  │plugin-sdk│
    └─────────┘  └────────────┘  └──────┘  └──────────┘

    game-lua-definitions sits beside the compiler: it reads the same
    command registry, but emits editor metadata rather than mod output.
```

`compiler` never imports `cli`. `registry` never imports `validator`. If you
find yourself wanting to reverse an arrow, the abstraction is in the wrong place.

## What each package is for

### `core`

The vocabulary everything else speaks.

- **Verification statuses** — `verified`, `experimental`, `community-reported`,
  `unverified`, `unsupported`, `planned`, plus the rule that only the first two
  build without an explicit opt-in.
- **Provenance** — source records and the index that resolves them. A record
  citing a source id that does not exist is an error.
- **Diagnostics** — 30 stable codes, a bag that sorts deterministically, and
  human explanations for every one. `sah explain` and the MCP
  `explain_diagnostic` tool read the same table.
- **Path safety** — two distinct concerns kept apart: host filesystem
  containment (`resolveWithin`) and _game_ path shape (`inspectGamePath`,
  which knows what Windows forbids even when you are authoring on Linux).
- **Determinism helpers** — `stableStringify` sorts keys at every level;
  `normaliseText` forces LF and one trailing newline.

### `schemas`

Zod schemas for campaigns, missions, dialogue, night presets, compatibility
profiles, registry records and the capability matrix.

The authoring model is _the toolkit's_, not a mirror of the game's data layout.
`ObjectiveSchema` has a `talkto` variant with a `character` field because that
reads well; whether it can be compiled is a separate question the registry
answers.

The `Reference` type is worth noting: a plain string in the common case, or an
object with `allowUnverified: true` and a mandatory `reason`. That is the
explicit escape hatch, and using it puts an entry in the build manifest.

### `registry`

Loads `data/registries/*.yaml`, validates each record against the schema for its
kind, and drops anything malformed rather than loading it half-valid — a
malformed record must never be usable as evidence that a game fact exists.

Search is deliberately simple and deterministic: substring matching with
separator normalisation, no fuzzy matching. Someone searching for a location
that is not verified should get _nothing_, not a confident near-miss that invites
them to use it anyway.

Extra registry directories can be layered on top of the built-ins, which is how
the test suite exercises weak-verification paths without polluting real data.

### `validator`

Loading (`project.ts`) is separate from checking (`validate.ts`). Loading gets
documents off disk safely and reports what it could not read; checking is
semantic.

Rules cover schema validity, duplicate ids, reference resolution across seven
registry kinds, objective compiler support, command arity and scope, required
hacks, conversation and speaker resolution, statically detectable stage
transition problems, path safety, Windows path shape, and case collisions.

### `adapter-game-lua`

Two jobs, kept apart:

1. **`GameLuaEmitter`** — knows the rules from Game.lua's README: every command
   prefixed with `Game.`, strings always quoted, backslashes doubled,
   conditionals closed with `Game.EndIf()` rather than `}`, `Not_` for inverse
   conditionals. It tracks scope depth and refuses to close a scope that is not
   the innermost one.
2. **`emitMission`** — checks _every_ call against the command registry for
   arity and scope before writing it. A generated script therefore cannot
   contain a command that does not exist or one used in the wrong scope.

It also resolves registry ids to **game codes**. The registry knows
`level1-carstart`; the game knows `level1_carstart`. Emitting the former would
produce a mod full of identifiers the game has never heard of.

### `game-lua-definitions`

Generates `Game.meta.lua`, a Lua Language Server definition file for the 339
`Game.*` commands.

It exists because Game.lua builds its command table **at runtime** — `AddCommand`
installs a closure per command — so no editor can discover those functions by
reading source. Donut Team's published definitions cover the Custom Files API and
deliberately stop there; this fills the other half.

Everything is derived from the command registry, so the definitions inherit its
provenance. Arity becomes optional parameters (`AddStage` accepts 0-7, so all
seven are `?`), which makes LuaLS enforce _both_ bounds through its
`missing-parameter` and `redundant-parameter` diagnostics. Scope is documented
but not enforced, and the file says so — a language server cannot know where in
an emitted script a call lands. Argument names and types are `argN: any`,
because no source read by this project documents them.

`sah lua-defs check` re-reads the artifact rather than trusting the generator,
and fails on four separate kinds of drift: a missing command, an invented one,
arity or scope that no longer matches the registry, and a stale upstream pin.

### `adapter-lucas-launcher`

Generates `Meta.ini`, `CustomFiles.ini` and `CustomFiles.lua`. Every key emitted
appears in Donut Team's documentation. Repeated keys (`Category`, `RequiredHack`,
`AuthorGroup`) use the documented repeat form rather than comma-separated lists,
and `[PathHandlers]` keys are written with doubled backslashes, matching the
documentation's own examples.

### `compiler`

`validate → generate → check output paths → manifest → write`.

It refuses to build on any validation error and writes nothing in that case.
`--dry-run` touches the filesystem not at all — verified by a test that asserts
the output directory does not exist afterwards.

The **build manifest** is the accountability artefact: a SHA-256 for every
generated file, the registry records the output depended on, the provenance
sources behind those records, the pinned upstream Game.lua commit, every
accepted risk, and a plain-language disclaimer stating what a successful build
does _not_ prove.

Wall-clock time is omitted by default, because determinism is a requirement and
a timestamp would break byte-identical rebuilds.

### `cli`

Commander-based. Every action returns an exit code instead of calling
`process.exit`, and `exitOverride` is applied across the whole command tree, so
the CLI runs in-process and its exit codes are tested rather than assumed.

Exit codes: `0` ok, `1` validation failed, `2` usage, `3` not found, `4`
unsupported here, `5` refused overwrite, `70` internal.

### `mcp-server`

The caller of an MCP tool is a language model, so its inputs get the scrutiny of
untrusted network input.

- Every path resolves through a sandbox confined to one workspace root.
- A configured game or launcher path is added to a forbidden list, so no tool
  can reach it even by accident.
- **No tool writes files.** Scaffolding tools return content for Claude Code to
  write through its own reviewed edit flow, so a model cannot silently modify a
  repository through this server.
- `compile_campaign` defaults to a dry run.
- Nothing returns environment variables or the API key.

Tool descriptions carry guidance text aimed at the model — an empty
`search_registry` result explicitly says "do NOT invent one".

### `ai`

Optional, key-gated, and the rest of the toolkit never imports it on a hot path.
The Anthropic SDK is imported lazily so nothing loads it unless an `sah ai`
command runs.

The pipeline is propose → parse → validate references → diff → confirm →
validate again. Steps two and three are implemented and tested; the interactive
diff-and-confirm step is not, so the commands refuse rather than write
unreviewed output.

Guardrails: spending ceiling with a deliberately pessimistic cost estimate,
secret redaction before anything leaves the machine, and a binary-file blocklist.

### `plugin-sdk`

A typed contract with **no loader**. Plugins would contribute _game facts_, so a
loader that is not yet safe would defeat the toolkit's one guarantee. The
security requirements a future loader must satisfy are documented in the package
itself.

## Data layout

```
data/
├── provenance/sources.yaml          every source any record may cite
├── registries/                      one file per registry kind
│   ├── commands.yaml                GENERATED from upstream Game.lua
│   ├── characters.yaml              GENERATED from Donut Team's docs
│   └── ...                          hand-written, each record cited
├── capability-matrix/               what the toolkit can and cannot do
└── upstream/upstream.lock.json      pinned commits + per-file SHA-256
```

Two registries are **generated**, not hand-edited. `scripts/research/*.mjs`
derive them from upstream, and CI fails if they drift. This is why 339 commands
have correct argument counts: nobody transcribed them.

## Decisions worth knowing about

| Decision                                             | Why                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript pinned to `~5.9`                          | `typescript-eslint@8` supports `>=4.8.4 <6.1.0`. Adopting TS 7 would ship a repo whose own lint task cannot run.                     |
| ESM + `NodeNext`                                     | Matches Node 20+, the MCP SDK and the Anthropic SDK. Relative imports carry `.js` extensions.                                        |
| Upstream Lua fetched, never vendored                 | Keeps the repo free of third-party code while staying reproducible via hashes. Upstream keeps ownership of distribution.             |
| Objectives with unknown parameters refuse to compile | Emitting `AddObjective("goto")` without the call that sets its destination produces a stage that loads and can never be completed.   |
| The flagship example fails validation                | It is the demonstration. A CI job fails if it ever starts passing.                                                                   |
| `exactOptionalPropertyTypes` on                      | Catches the class of bug where an explicitly-`undefined` field differs from an absent one — which matters when generating INI files. |

## Testing

163 tests. No test requires a game installation, an API key, or network access.

The load-bearing ones are the ones that would catch a regression in the core
guarantee: that the flagship example still fails, that empty registries stay
empty of unsourced records, that builds are byte-identical, that the MCP sandbox
rejects traversal, and that every diagnostic code has an explanation.
