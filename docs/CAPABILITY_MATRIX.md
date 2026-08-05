# Capability matrix

What this toolkit, the Mod Launcher and the game can and cannot do — stated
plainly, so nobody builds a plan on an assumption.

Statuses: `verified` (a source proves it) · `experimental` (implemented, not
confirmed in-game) · `community-reported` (asserted, unchecked) · `unverified`
(unknown) · `unsupported` (known not to work) · `planned` (intended, not built).

---

## Toolkit capabilities

| Capability                                            | Status          | Notes                                     |
| ----------------------------------------------------- | --------------- | ----------------------------------------- |
| Author campaigns, missions, dialogue, presets in YAML | verified        | Schema-validated                          |
| Validate references against verified registries       | verified        | 30 diagnostic codes                       |
| Refuse to build on unverified references              | verified        | The core guarantee                        |
| Deterministic build output                            | verified        | Byte-identical; tested                    |
| Generate `Meta.ini`                                   | verified        | Every key from documented format          |
| Generate `CustomFiles.ini` with `[PathHandlers]`      | verified        | Matches documented examples               |
| Generate `CustomFiles.lua`                            | verified        | Uses documented `dofile` form             |
| Generate mission Lua via `Game.lua`                   | verified        | Arity- and scope-checked against upstream |
| Validate command arity and scope                      | verified        | Derived from Game.lua's own tables        |
| Build manifest with hashes and provenance             | verified        | SHA-256 per file                          |
| Package a mod into a deterministic archive            | verified        | No timestamps                             |
| Local MCP server                                      | verified        | Sandboxed, read-only                      |
| Copy user-supplied assets                             | verified        | Refuses paths outside the campaign        |
| Export dialogue as structured data                    | verified        | Plus a manual-steps report                |
| **Generate game dialogue files**                      | **planned**     | Formats not verified; will not guess      |
| **Generate `CustomDialogueCharacterCodes.ini`**       | **planned**     | Hack documented; generation not built     |
| **AI-assisted authoring end to end**                  | **planned**     | Guardrails done; review gate missing      |
| **Plugin loading**                                    | **planned**     | Contract typed; no loader by design       |
| **Pure3D reading or editing**                         | **planned**     | Adapter boundary only                     |
| **Launching the game**                                | **unsupported** | Windows-only, and out of scope            |

## Game and Mod Launcher capabilities

| Capability                                        | Status       | Notes                                                      |
| ------------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Override game files without modifying the install | verified     | Custom Files hack                                          |
| Run Lua when the game requests a file             | verified     | Path handlers                                              |
| Generate MFK/CON dynamically from Lua             | verified     | Game.lua's entire purpose                                  |
| Mission stages, objectives and conditions         | verified     | Commands documented                                        |
| Per-stage traffic density                         | verified     | `SetMaxTraffic`, `NoTrafficForStage`                       |
| Per-mission pedestrian groups                     | verified     | `UsePedGroup` with custom groups                           |
| Conditional script blocks                         | verified     | ASF hack; closed with `Game.EndIf()`                       |
| Custom dialogue character codes                   | verified     | `CustomDialogueCharacterCodes` hack                        |
| Play a pre-rendered video                         | verified     | `fmv` objective — not an in-engine cutscene                |
| Replace sky / lighting / audio assets             | experimental | Override mechanism verified; the _result_ is not           |
| Control fog parameters                            | unverified   | No source found either way                                 |
| Post-processing / VHS presentation                | unverified   | External injectors, configured by the player, not by a mod |

## Things this game does not do

Listed explicitly, because they are common assumptions carried over from other
open-world games. Do not plan around them.

| Assumption                             | Status          | Why                                                                                  |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| Day/night cycle or simulated clock     | **unsupported** | No such system. A "night campaign" is asset and lighting choices plus mission design |
| Dynamic weather progression            | **unsupported** | No weather system. "Fog" means a static visual choice at best                        |
| Dynamic NPC schedules                  | **unsupported** | Peds come from ped groups, not simulated routines                                    |
| Persistent open-world damage           | **unsupported** | Not a persistent-world engine                                                        |
| In-engine cinematic cutscenes          | **unsupported** | The `fmv` objective plays a pre-rendered file                                        |
| Runtime HTTP requests from a mod       | **unsupported** | Custom Files Lua is sandboxed to file handling                                       |
| Live AI-generated missions during play | **unsupported** | Scripts are generated at load time, not authored at runtime                          |
| Dynamic radio broadcasts               | **unsupported** | No such system                                                                       |
| Unrestricted save-state modification   | **unsupported** | The Launcher exposes specific custom save-data functions, not arbitrary access       |

If you believe one of these is wrong, that is a genuinely valuable finding —
open an issue with a source and it will be corrected. What must not happen is
someone quietly assuming one works and designing a campaign around it.

## Machine-readable form

`data/registries/preset-capabilities.yaml` holds the preset-related entries with
full provenance. Query them:

```sh
sah registry search preset-capability "time of day"
sah registry list preset-capabilities
```

Or via MCP, `get_capability_status` — which is the tool Claude Code should call
before telling anyone a feature is achievable.
