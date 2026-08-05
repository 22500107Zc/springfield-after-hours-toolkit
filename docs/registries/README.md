# Working with the registries

The registries are the toolkit's model of what actually exists in the game.
Everything else — validation, compilation, the MCP tools — is downstream of them.

## Why an empty registry is a feature

`data/registries/locations.yaml` contains zero records. So does `vehicles.yaml`.

That is not an oversight or a to-do. It is an accurate statement: **no source
consulted so far states any of it.** The consequence is that a campaign
referencing the Java Server, or the Honor Roller, fails to build.

The alternative would be to fill the registry with plausible names. That
produces a toolkit that generates mods which load in the game and then silently
do not work — which is the exact failure this project exists to prevent.

So when a search comes back empty, the honest response is "the toolkit has no
evidence this exists", not a guess.

## Registry kinds

| Kind                     | Records | Status                                                |
| ------------------------ | ------: | ----------------------------------------------------- |
| `commands`               |     339 | Generated from upstream Game.lua                      |
| `characters`             |      64 | Generated from Donut Team's published table           |
| `objectives`             |      37 | Names verified; most parameters undocumented upstream |
| `conditions`             |      28 | Names verified; parameters undocumented upstream      |
| `preset-capabilities`    |       7 | What a night preset may claim                         |
| `hacks`                  |       4 | Mod Launcher hacks                                    |
| `locators`               |       4 | Documentation examples only                           |
| `compatibility-profiles` |       2 | Both `unverified` placeholders                        |
| `hud-icons`              |       1 | Documentation example only                            |
| `levels`                 |       1 | `level01` only                                        |
| `locations`              |       0 | **Nothing verified**                                  |
| `vehicles`               |       0 | **Nothing verified**                                  |
| `maps`                   |       0 | **Nothing verified**                                  |
| `interiors`              |       0 | **Nothing verified**                                  |
| `assets`                 |       0 | **Nothing verified**                                  |

## Two files you must not hand-edit

`commands.yaml` and `characters.yaml` are **generated**:

```sh
npm run registry:derive-commands                          # from upstream Game.lua
node scripts/research/derive-character-registry.mjs       # from Donut Team's docs
node scripts/research/derive-command-registry.mjs --check  # what CI runs
```

Deriving rather than transcribing is why 339 commands have correct argument
counts and scope rules. Edit the script, not the YAML.

## Adding a record

### 1. Find a source

In descending order of weight:

| Source type                                                | Status it justifies                           |
| ---------------------------------------------------------- | --------------------------------------------- |
| Official Donut Team documentation                          | `verified`                                    |
| Upstream source at a pinned commit                         | `verified`                                    |
| A file from your own game/mod install, precisely described | `verified` or `experimental`                  |
| Community forum or wiki                                    | `community-reported`                          |
| Your own observation while playing                         | `manual-observation` → usually `experimental` |
| A hunch                                                    | **none — do not add it**                      |

### 2. Record the source

In `data/provenance/sources.yaml`:

```yaml
- id: dt-docs-some-page
  type: official-documentation
  title: 'Some Page | DT Docs'
  url: https://docs.donutteam.com/docs/...
  publisher: Donut Team
  retrievedAt: '2026-08-05'
```

### 3. Add the record

```yaml
- id: java-server-exterior # lower-kebab-case; used in campaign YAML
  displayName: java_server_ext # human-facing name
  gameCode: java_server_ext # what the GAME calls it — this is emitted
  category: mission-destination
  locatorType: 'Type 3'
  level: level01
  verificationStatus: verified
  verifiedAt: '2026-08-05'
  provenance:
    sources: [dt-docs-some-page]
    detail: 'Quote or describe exactly where in the source this appears.'
  notes:
    - 'State the limits of the claim. What does this record NOT prove?'
```

`id` and `gameCode` are different on purpose. The registry id is the toolkit's
handle; the game code is what gets written into the generated script. Emitting
the id would produce a mod full of identifiers the game has never heard of.

### 4. Check it

```sh
sah registry validate
sah registry search locator java-server-exterior
npm test
```

`sah registry validate` confirms every record is schema-valid and cites a source
that exists.

## Choosing a status honestly

- **`verified`** — a source states it directly. Not "a source implies it".
- **`experimental`** — you implemented or observed it, but it has not been
  confirmed against a real game.
- **`community-reported`** — someone said so. Record who.
- **`unverified`** — you know the name, not what it means. Perfectly respectable.
- **`unsupported`** — you have positive evidence it does not work. Valuable.
- **`planned`** — intended, not built.

Only `verified` and `experimental` build without an explicit per-reference
opt-in.

## Extending the registries without editing the repository

Point the toolkit at an extra data directory:

```sh
export SAH_REGISTRY_DIR=/path/to/my-registry-data
```

It must contain `registries/` and optionally `provenance/`, in the same shape as
`data/`. Later directories override earlier ones, which is how a project can
carry its own records without patching the toolkit.

`fixtures/test-data/` is a small worked example of this.

## The escape hatch

If you must build against something not verified, opt in per reference:

```yaml
resetPlayerInCarLocator:
  ref: some-locator
  allowUnverified: true
  reason: 'Observed working in my install on 2026-08-05; not yet documented.'
```

`reason` is required, deliberately. The override produces a prominent warning and
is recorded in the build manifest's `acceptedRisks`, so it stays visible rather
than becoming invisible technical debt.
