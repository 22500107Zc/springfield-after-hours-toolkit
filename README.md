# Springfield After Hours Toolkit

**Tools for making and preparing mods for _The Simpsons: Hit & Run_.**

No Node, no npm, no Git, no command-line experience needed. Download one file,
open it, and answer a few questions.

> **Unofficial fan project.** Not affiliated with, endorsed by, or sponsored by
> Electronic Arts, Disney, Fox, Radical Entertainment or Donut Team. Contains no
> game code, assets, audio or map data, and never will.

---

## Get started in four steps

**1. Download the file for your computer.**

| Your computer                               | Download                               |
| ------------------------------------------- | -------------------------------------- |
| **Mac** with Apple Silicon (M1, M2, M3, M4) | `sah-0.1.1-macos-apple-silicon.tar.gz` |
| **Mac** with an Intel processor             | `sah-0.1.1-macos-intel.tar.gz`         |
| **Windows**                                 | `sah-0.1.1-windows-x64.zip`            |
| **Linux**                                   | `sah-0.1.1-linux-x64.tar.gz`           |

From the [latest release](https://github.com/22500107Zc/springfield-after-hours-toolkit/releases/latest).

_Not sure which Mac you have?_ Click the Apple menu → **About This Mac**. If it
says **Apple M1/M2/M3/M4**, choose Apple Silicon. If it says **Intel**, choose
Intel.

**2. Extract it.** Double-click the downloaded file.

**3. Run the Start Here file** in the folder that appears.

- macOS — **Start Here.command**
- Windows — **Start Here.bat**
- Linux — **Start Here.sh**

**4. Choose what to do.**

```
sah start     Create a new mod project, guided step by step
sah tools     Six jobs you do to a mod folder, as a menu
sah help      Plain-language help
```

### macOS will probably block it the first time

That is expected — this download is **not signed with an Apple developer
certificate and has not been notarized**. macOS blocks unsigned downloads by
default.

To allow this one file:

1. Open **System Settings** → **Privacy & Security**.
2. Scroll down to the message about `sah` being blocked.
3. Click **Open Anyway**.
4. Double-click **Start Here.command** again.

Or from Terminal, in the extracted folder:

```sh
xattr -d com.apple.quarantine ./sah
./sah start
```

**Do not turn Gatekeeper off system-wide.** You never need to, and it protects
everything else you download.

Windows shows a similar blue "Windows protected your PC" box for the same
reason: click **More info** → **Run anyway**.

---

## Your first mod project, in five minutes

Run `sah start`. It asks:

- **What should the mod be called?** — the name players see. Changeable later.
- **Who is the author?** — a nickname is fine.
- **Where should it go?** — press Enter for the suggestion.
- **Include an example mission script?** — yes, if you are learning.
- **Set up autocomplete?** — yes. It only writes inside your project.

Then it shows you **exactly what it will create**, and waits. Nothing is written
until you say yes, and it will never overwrite a folder that already exists.

You end up with:

```
my-mod/
├── Meta.ini                              how the Mod Launcher lists your mod
├── CustomFiles.ini                       which game paths your mod handles
├── CustomFiles.lua                       runs when the mod loads
├── README.md                             what to edit first
└── Resources/
    ├── scripts/example-mission.lua       a commented example to learn from
    └── lib/                              where Game.lua goes (not included)
```

Open that folder in an editor with the **Lua Language Server** extension
(`sumneko.lua` in VS Code). Type `Game.` and you get 351 completions, each with
its argument count and required scope.

Full walkthrough: **[Your first mod project](docs/getting-started/first-project.md)**.

---

## The six Pocket Tools

Run `sah tools` and pick a number.

| #   | Tool                                     | What it does                                                      |
| --- | ---------------------------------------- | ----------------------------------------------------------------- |
| 1   | Check filename capitalization            | Finds names that work on your machine and break for everyone else |
| 2   | Create a clean release copy              | Copies your mod without `.DS_Store` and other clutter             |
| 3   | Compare mods for possible file conflicts | Shows paths more than one mod supplies                            |
| 4   | Create a file manifest                   | Records every file and its fingerprint                            |
| 5   | Compare two releases                     | What was added, removed, changed or renamed                       |
| 6   | Copy a Windows-style mod path            | Gets a path in the exact form each file needs                     |

You can drag a folder from Finder or Explorer straight into the terminal to fill
in its path.

Every tool also has a scriptable form (`sah pocket case-check <dir>`, and so on)
with `--json` for automation. See the
**[Pocket Tools guide](docs/getting-started/pocket-tools.md)**.

---

## What this does, and what it cannot do

**It can:** create a mod project, set up editor autocomplete for the `Game.*`
commands, check your files for the mistakes that break other people's machines,
compare mods, and prepare a clean folder to upload.

**It cannot tell you whether your mod works when you play it.**

Preparing a mod and testing a mod are different jobs. This toolkit does the
first. For the second you need, separately:

- a lawful copy of _The Simpsons: Hit & Run_,
- **Lucas' Simpsons: Hit & Run Mod Launcher** (Windows),
- **`Game.lua`** from [Donut Team](https://github.com/donutteam/game-lua) (MIT).

None of those are included here, and this toolkit neither provides nor replaces
any of them. Nothing in this project has been run in the game — see
[what is tested and what is not](docs/releases/0.1.1.md#what-is-tested-and-what-is-not).

Something went wrong? **[Troubleshooting](docs/getting-started/troubleshooting.md)**.
Every command takes `--debug` for technical detail.

---

## Built with AI assistance

The code, tests and documentation in this project were written by Claude
(Anthropic), with design constraints, review and acceptance decisions from the
maintainer.

That is worth knowing when you decide how much to trust it. The things to trust
are the tests, the pinned upstream hashes and the published checksums — all
reproducible with `npm run check` from a checkout. Where a claim could not be
checked, the tools refuse to make it: undocumented argument types stay `any`,
overlapping mod paths are called _potential_ conflicts, and the example mission
says in its own header that nobody has played it.

---

## For developers

Everything above is the beginner path. If you want to build from source, work on
the toolkit, or use the campaign compiler:

- **[Building from source and contributing](CONTRIBUTING.md)**
- **[Architecture](ARCHITECTURE.md)** — packages, layering, why the registry works the way it does
- **[Campaign authoring](docs/getting-started/authoring.md)** — the YAML compiler
- **[Registries and provenance](docs/registries/README.md)** — how game facts get verified
- **[Claude Code and MCP](docs/getting-started/mcp.md)**
- **[Publishing a release](docs/releases/README.md)**

```sh
git clone https://github.com/22500107Zc/springfield-after-hours-toolkit.git
cd springfield-after-hours-toolkit
npm install && npm run build
npm run check          # everything CI runs
```

Requires Node.js 20+.

---

---

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

**Tested vs untested, stated plainly**

The line matters more than any feature in the table above, so it gets said
twice:

| Tested — by 416 automated tests on macOS, Windows and Linux                                     | Untested — no verified claim is made                             |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Generated definitions parse as real Lua 5.3, match the registry, and detect five kinds of drift | That a mod built by this toolkit loads                           |
| `lua-defs install` writes what it plans, verifies pinned hashes, and refuses partial installs   | That a generated mission can be completed                        |
| Every pocket tool's file behaviour: collisions, junk, symlinks, traversal, hashes, exit codes   | That autocomplete passing means a script works — **it does not** |
| Determinism: byte-identical manifests across repeated runs, per platform                        | That two overlapping mods actually conflict at runtime           |

**Nothing here has been run in the actual game.** No one who built this had a
game installation, a Mod Launcher installation, or Windows. Generated files
match the documented formats and the mission Lua is checked against Game.lua's
own command tables — but "matches the documentation" is not "loads in the game".

**Not working yet**

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

## Authoring a campaign

The other half of the toolkit: describe a campaign in YAML, and it refuses to
build anything it cannot verify. `npm run upstream:fetch` is needed here — it
downloads Donut Team's `Game.lua` (MIT) into a git-ignored directory so a built
mod can ship it.

A build produces:

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

`sah doctor` tells you the truth about your platform — including that the Mod
Launcher is a Windows application and cannot be launched natively from macOS or
Linux. Full guide: [`docs/getting-started/authoring.md`](docs/getting-started/authoring.md).

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

---

## Licence

MIT — see [LICENSE](LICENSE). That covers this repository's original code and
data only.

No game, no game assets, no extracted audio, no proprietary map files, no assets
from any community mod. Upstream Lua is fetched from pinned commits, verified
against recorded hashes, and never committed here. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

If you build a mod with this, ship only your own work.

## Acknowledgements

Built on the work of **Donut Team**, whose Mod Launcher, documentation and
`Game.lua` make this whole ecosystem possible. This project is not affiliated
with them; it just relies heavily on what they have published.
