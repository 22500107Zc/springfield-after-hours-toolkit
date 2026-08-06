# Springfield After Hours Toolkit

An open toolkit for authoring story-driven campaigns for _The Simpsons: Hit &
Run_, targeting **Lucas' Simpsons: Hit & Run Mod Launcher**.

You describe a campaign in readable YAML. The toolkit validates every reference
against a registry of **verified** game content, then generates a Mod Launcher
mod — `Meta.ini`, `CustomFiles.ini`, `CustomFiles.lua` and mission scripts built
on Donut Team's `Game.lua`.

_Springfield After Hours_ is the flagship campaign, but it is an example inside
this repository. The toolkit is built for anyone's campaign.

> **Unofficial fan project.** Not affiliated with, endorsed by, or sponsored by
> Electronic Arts, Disney, Fox, Radical Entertainment or Donut Team. Contains no
> game code, assets, audio or map data, and never will.

---

## The idea

Most modding tools help you write files faster. This one is mostly concerned
with **stopping you from writing files that are wrong**.

If a campaign references a locator that does not exist, the game does not throw
an error. It loads the mission, and the mission simply cannot be completed. You
find out ten minutes into a playtest, if you are lucky.

So the toolkit keeps a registry of game facts, every one carrying a source and a
verification status, and **refuses to build** when a campaign references
something it cannot verify:

```console
$ sah validate examples/springfield-after-hours

error SAH2003 at missions/garage-search.yaml mission.startingVehicle:
  Unresolved Vehicle reference "honor-roller".
  hint: The vehicle registry is empty because no source consulted so far states
        any vehicle's internal name. Do not guess "honor-roller" — find a
        citable source first.

6 errors, 0 warnings, 4 notes
```

That output is not a bug report. It is the flagship example, working as
designed: a precise, itemised list of what the community still needs to verify.

## Current status: early foundation

**Working today**

| Capability                                                  | State                                              |
| ----------------------------------------------------------- | -------------------------------------------------- |
| Campaign / mission / dialogue / preset authoring in YAML    | schema-validated                                   |
| Registry of verified game content                           | 487 records, all with provenance                   |
| Validation                                                  | 30 diagnostic codes, machine-readable JSON output  |
| Deterministic build                                         | byte-identical output from identical input         |
| `Meta.ini`, `CustomFiles.ini`, `CustomFiles.lua` generation | matches documented formats                         |
| Mission Lua generation via `Game.lua`                       | arity- and scope-checked against upstream          |
| Build manifest                                              | SHA-256 per file, provenance per fact              |
| Local MCP server                                            | 12 sandboxed tools for Claude Code                 |
| Editor autocomplete for `Game.*`                            | 351 LuaLS definitions, generated from the registry |
| `sah` CLI                                                   | 28 commands, meaningful exit codes                 |
| SHAR Pocket Tools                                           | 6 offline file utilities, no game knowledge needed |

**Not working yet, stated plainly**

- **Nothing here has been run in the actual game.** No one who built this had a
  game installation, a Mod Launcher installation, or Windows. Generated files
  match the documented formats and the mission Lua is checked against Game.lua's
  own command tables — but "matches the documentation" is not "loads in the game".
- **The locations and vehicles registries are empty.** Not a placeholder — empty,
  because no source consulted so far states any of it.
- **Only one objective compiles.** `dummy`, the documented no-op. Most objective
  pages upstream currently read "TODO", so their parameters are unknown and the
  toolkit refuses to guess.
- **`sah ai` commands refuse to run.** The guardrails exist; the diff-and-confirm
  review step does not, so they will not write unreviewed model output.
- **Night presets are design manifests.** Each setting carries its own support
  status; most are `planned` or `unverified`.
- **No plugin loader.** The contract is typed; running third-party code safely is
  not solved yet.

## Install

Requires **Node.js 20+**. Works on macOS, Windows and Linux.

```sh
git clone https://github.com/22500107Zc/springfield-after-hours-toolkit.git
cd springfield-after-hours-toolkit
npm install
npm run build
npm run upstream:fetch   # downloads Donut Team's Game.lua (MIT), not bundled here
```

Check your environment:

```sh
node packages/cli/dist/bin.js doctor
```

`doctor` tells you the truth about your platform — including that the Mod
Launcher is a Windows application and cannot be launched natively from macOS or
Linux.

## Quick start

```sh
# Create a campaign workspace that validates out of the box
sah init my-campaign --id my-campaign --title "My Campaign"

# See what content actually exists before you reference it
sah registry search character "Comic Book Guy"
sah registry search command AddStage
sah registry list levels

# Author, then check
sah mission new sneak-out -C my-campaign
sah validate my-campaign

# Build
sah build my-campaign --dry-run
sah build my-campaign
sah package my-campaign
```

(`sah` is `node packages/cli/dist/bin.js` until you link it.)

### What a build produces

```
build/
├── Meta.ini                                  mod metadata + required hacks
├── CustomFiles.ini                           [PathHandlers] → generated Lua
├── CustomFiles.lua                           loads Game.lua at mod start
├── Resources/scripts/missions/level01/m0i.lua
├── README.generated.md
└── build-manifest.json                       hashes + provenance for all of it
```

The mission script is ordinary `Game.lua`:

```lua
Game.SelectMission("m0")
	Game.SetMissionResetPlayerInCar("level1_carstart")

	-- Stage: opening-stage
	Game.AddStage()
		Game.RESET_TO_HERE()
		Game.SetHUDIcon("kwike")
		Game.AddObjective("dummy")
		Game.CloseObjective()
	Game.CloseStage()

Game.CloseMission()
```

## The registry

Every record carries provenance and one of six verification statuses:
`verified`, `experimental`, `community-reported`, `unverified`, `unsupported`,
`planned`. Only `verified` and `experimental` build without an explicit opt-in.

| Registry                                         | Records | Where they came from                                                    |
| ------------------------------------------------ | ------: | ----------------------------------------------------------------------- |
| commands                                         |     339 | derived from `Game.lua`'s own command tables — arity and scope included |
| characters                                       |      64 | Donut Team's published dialogue character code table                    |
| objectives                                       |      37 | the documented base-game and ASF objective lists                        |
| conditions                                       |      28 | the documented condition lists                                          |
| preset-capabilities                              |       7 | what a night preset may and may not claim                               |
| hacks                                            |       4 | Mod Launcher hack documentation                                         |
| locators                                         |       4 | documentation examples only                                             |
| hud-icons, levels                                |  1 each | documentation examples only                                             |
| **locations, vehicles, maps, interiors, assets** |   **0** | **nothing verified yet**                                                |

The command registry is _derived_, not transcribed: `npm run
registry:derive-commands` parses upstream `Game.lua` and CI fails if the result
drifts. That is why `SetStageTime` is known to take exactly one argument inside a
Stage scope, and why passing it three is a build error rather than a Lua crash
later.

**Expanding the locator and vehicle registries is the highest-value contribution
to this project.** See [`docs/registries/README.md`](docs/registries/README.md).

## Editor autocomplete for mission scripts

Game.lua builds its `Game` table at runtime, so editors know nothing about
`Game.AddStage` or the other 338 commands. Donut Team's published Lua Language
Server definitions cover the Custom Files API (`Output`, `GetModPath`, …) and
stop there, by design.

This repository generates the missing half from the same verified command
registry:

```sh
node packages/cli/dist/bin.js lua-defs install ~/path/to/your-mod --with-official
# review the plan, then:
node packages/cli/dist/bin.js lua-defs install ~/path/to/your-mod --with-official --apply
```

You get completion for all 339 commands plus their 10 `Not_` inverses, hover
docs carrying each command's scope and argument range, and real
argument-count checking — LuaLS's `missing-parameter` and `redundant-parameter`
are both on by default, and the generated signatures encode both bounds.

Argument _types_ are `any` and scope rules are documentation only, because
neither is documented upstream and a language server cannot verify call
placement. `sah validate` does enforce scope. Full guide:
[`docs/getting-started/lua-definitions.md`](docs/getting-started/lua-definitions.md).

## SHAR Pocket Tools

Six tiny utilities for the part of modding that is not authoring — cleaning,
comparing and preparing mod folders. They know nothing about the game, which is
exactly why they work today while the location and vehicle registries are empty.

```sh
sah pocket case-check ./my-mod          # paths and references that differ only by case
sah pocket clean-export ./my-mod ./out  # a copy without .DS_Store, __MACOSX, editor junk
sah pocket conflicts ./mod-a ./mod-b    # paths supplied by more than one mod
sah pocket manifest ./my-mod            # deterministic path + size + SHA-256 record
sah pocket diff ./v1 ./v2               # added, removed, modified, renamed, case-only
sah pocket path ./my-mod a/b.lua --copy # windows / posix / ini / lua path forms
```

Read-only by default — `clean-export` writes a _copy_, and deleting from the
original takes `--in-place --yes`. Offline, deterministic, and confined to the
folder you name: symlinks are never followed and nothing outside it is read.

**They inspect and prepare files; they do not prove a mod works in-game.** Full
guide: [`docs/getting-started/pocket-tools.md`](docs/getting-started/pocket-tools.md).

## Claude Code and MCP

The repository ships a local MCP server so Claude Code uses the toolkit's real
validation instead of guessing at YAML.

```sh
npm run mcp
```

`.mcp.json` registers it for this project. Tools include `search_registry`,
`validate_campaign`, `compile_campaign`, `preview_generated_files`,
`explain_diagnostic` and `get_capability_status`.

The server is deliberately conservative: all file access is confined to one
workspace root, path traversal is refused, a configured game installation is
explicitly off limits, **no tool writes files**, and nothing returns environment
variables or the API key. Scaffolding tools return content for Claude Code to
write through its normal reviewed edit flow.

See [`docs/getting-started/mcp.md`](docs/getting-started/mcp.md).

## Optional Anthropic API integration

Entirely optional. Everything above works without an API key, and Claude Code
does not need one — it uses your normal Claude authentication.

```sh
export ANTHROPIC_API_KEY=...   # never stored in config; read from the environment only
sah ai doctor
```

The design is propose → parse → validate → diff → confirm → validate again.
Model output is never a build input. Today `sah ai plan` and friends **refuse to
run** because the diff-and-confirm step is unimplemented; the parser,
registry-reference checker, spending safeguards and secret redaction are done and
tested. Using these commands will incur charges on your account.

## Legal

MIT licensed — see [LICENSE](LICENSE). That covers this repository's original
code and data only.

This repository contains **no** game, game assets, extracted audio, proprietary
map files, or assets from any third-party community mod. Fully Connected Map and
Full Game Plus are _compatibility targets_, user-supplied and never bundled.
Upstream Lua is fetched from pinned commits into a git-ignored directory, with
its licence, rather than committed here. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

If you build a campaign with this, ship only your own work.

## Contributing

The most useful contributions right now are **verified game facts with
citations** — locators and vehicle internal names above all. Documentation for
objective parameters is a close second, since it is what keeps `goto` and
`talkto` from compiling.

See [CONTRIBUTING.md](CONTRIBUTING.md), [ARCHITECTURE.md](ARCHITECTURE.md) and
[ROADMAP.md](ROADMAP.md). Security policy: [SECURITY.md](SECURITY.md). Community
expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Acknowledgements

Built on the work of **Donut Team**, whose Mod Launcher, documentation and
`Game.lua` make this whole ecosystem possible. This project is not affiliated
with them; it just relies heavily on what they have published.
