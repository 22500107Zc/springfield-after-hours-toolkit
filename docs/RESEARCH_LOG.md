# Research log

A record of what was actually looked at, what it established, and — just as
important — what it did **not** establish.

Entries are append-only. If a later finding contradicts an earlier one, add a
new entry rather than editing history.

---

## 2026-08-05 — Foundation research

Everything below was fetched and read during the session that built the toolkit
foundation. No claim in this repository's registries comes from anywhere else.

### Donut Team documentation (`docs.donutteam.com`)

| Page                            | What it established                                                                                                                                                                                                                                                                            | What it did NOT establish                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Configuring Mods                | The complete documented `Meta.ini` key set: `[Miscellaneous]` with `Title`, `InternalName`, `Description`, `Version`, `Category`, `Main`, `RequiredHack`, `RequiredLauncher`, `Supports*` and more; plus `[Description]`, `[Author]` and `[Setting]` sections                                  | Nothing about mission content                                                    |
| Custom Files (Intro)            | `CustomFiles.ini` sections — `[Miscellaneous]` (`OccludedPath`, `ReadOnly`, `SuppressedPath`), `[PathRedirections]`, `[PathHandlers]`, `[AdditionalFiles]`; the `CustomFiles`, `AdditionalFiles` and `Resources` folder roles; that a mod requiring the hack must provide at least one of them | —                                                                                |
| Custom Files → Lua Scripting    | `CustomFiles.lua` executes when the mod loads; path handlers run when the game requests a matching file                                                                                                                                                                                        | The dialogue file formats                                                        |
| All Console Script Commands     | The full documented command list, organised by scope, with `Unused` and `Commented` markers describing how Radical's own scripts used each one                                                                                                                                                 | Argument counts (these came from Game.lua instead)                               |
| All Objectives                  | The 20 base-game objective type **names**                                                                                                                                                                                                                                                      | **Their parameters.** Most individual objective pages currently read only "TODO" |
| All Conditions                  | The 15 base-game condition type names                                                                                                                                                                                                                                                          | Their parameters                                                                 |
| ASF Objectives / Conditions     | The 15 objective and 13 condition types added by Additional Script Functionality                                                                                                                                                                                                               | Their parameters                                                                 |
| Characters                      | The full dialogue character code table: code, internal name, non-generic index and outfit list, for 64 characters                                                                                                                                                                              | Whether any character can be placed in any given mission                         |
| talkto                          | A worked example using `AddNPC`, `AddObjectiveNPCWaypoint` and `SetTalkToTarget`; that `SetTalkToTarget`'s first argument selects the drawable (0 = exclamation mark, 1 = "gift", 2 = "interior_icon") and the second is a height offset                                                       | The full call sequence needed to make a `talkto` objective work end to end       |
| Action Event Locator Types      | 29 locator type **names**                                                                                                                                                                                                                                                                      | What any of them do — every type page reads "TODO"                               |
| Dyna Load Data                  | The symbol table: `;` region load, `:` region unload, `@` interior load, `$` interior unload, `*` enable world sphere, `&` disable world sphere                                                                                                                                                | Which strings are correct for which mission                                      |
| Custom Dialogue Character Codes | The hack's `CustomDialogueCharacterCodes.ini` format, and that codes should be 3-4 characters                                                                                                                                                                                                  | —                                                                                |

### `github.com/donutteam/game-lua` @ `74f8059127bcd9555e6417d9b0b4f5dcef5b9a22`

MIT, © 2022 Donut Team.

**README** established the conventions the emitter implements:

- Copy `Game.lua` to the mod's `Resources` folder and load it from
  `CustomFiles.lua` with `dofile(GetModPath() .. "/Resources/lib/Game.lua")`
- Add a `[PathHandlers]` entry mapping the game's MFK path to the Lua script
- All commands are prefixed with `Game.`
- Strings must **always** be quoted, unlike Radical's MFK which omitted them in
  places
- Backslashes must be escaped (`\\`)
- Conditional blocks are closed with `Game.EndIf()`, not `}`
- Inverse conditionals use a `Not_` prefix

It also contains the canonical worked example this repository's
`examples/minimal-campaign` is modelled on — `SelectMission` /
`SetMissionResetPlayerInCar` / `SetDynaLoadData` / `UsePedGroup` / `AddStage` /
`RESET_TO_HERE` / `SetHUDIcon` / `SetStageMessageIndex` /
`AddObjective("dummy")` / `CloseObjective` / `CloseStage` / `CloseMission`.

That example is the source of the four documented-example records in the
registry: the locator `level1_carstart`, the gag trigger `JasperTrig`, the HUD
icon `kwike`, and the `level01` script and art paths.

**`src/Game.lua`** was the single most valuable find. Its `DefaultCommands`,
`ASFCommands` and `DebugTestCommands` tables encode, per command: `Name`,
`MinArgs`, `MaxArgs`, `RequiresScope`, `OpensScope`, `ClosesScope`,
`Conditional` and `IncrementCount`.

That is machine-readable validation data for 339 commands. Rather than
transcribe it — which would guarantee errors — the toolkit derives
`data/registries/commands.yaml` from it via
`scripts/research/derive-command-registry.mjs`, and CI verifies the result has
not drifted.

The same file also documents engine limits (`MissionStage: 25`,
`StageObjective: 1`, `StageVehicle: 4`, `ObjectiveAddNPCs: 4`, and others) which
are **not yet used by the validator** — a clear future improvement.

### `github.com/donutteam/lucas-mod-launcher-lua` @ `bddad4be6e9896252114417c3e98903f25e8ace6`

MIT. Lua Language Server definitions for Custom Files Lua functions. Upstream
recommends placing them at `Resources/lib/external/lucas-mod-launcher-lua` and
setting `"Lua.runtime.version": "Lua 5.3"`.

Recorded as **development-only**. These are editor type definitions, not a
runtime library, and the toolkit keeps that distinction explicit.

### `github.com/donutteam/pure3d-ts` @ `b1c7043d899ee27751a777bcd03d1d936a818a00`

MIT. Recorded as a planned adapter boundary. Not a dependency of anything here.

### `github.com/donutteam/mfk-to-lua` @ `6e19e7f78104877146bbc30d267d43d9da896c54`

**GPL-3.0.** Recorded as an external tool only. No code from it is used, linked
or derived here, so this repository's MIT licence is unaffected. Any change to
that must be a deliberate, documented licensing decision.

---

## Open questions

These are the things somebody could resolve, in rough order of value.

1. **What are the internal names of the vehicles?** Nothing consulted stated
   any of them, including the Honor Roller. The vehicle registry is empty as a
   direct result.
2. **What locators exist, and where?** Four are known, all from documentation
   examples for level 1. This is the biggest single blocker to real missions.
3. **What parameters do the objectives take?** Upstream documents the names but
   most parameter sections read "TODO". This is why `goto` and `talkto` refuse
   to compile.
4. **What is the dialogue text resource format?** Unknown, so the compiler
   exports structured JSON and a manual-steps report instead of guessing.
5. **What can a mod actually change about lighting and fog?** Unknown. The night
   presets record this honestly as `unverified` rather than implying it works.
6. **Do the generated files actually load?** Nobody has run them. This is the
   most important open question of all.

## How to add an entry

Include: the date, the exact source (URL or repository and commit), what it
established, and what it did not. The second half matters — an entry that only
records successes makes the registry look more complete than it is.
