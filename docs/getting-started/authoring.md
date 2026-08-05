# Authoring a campaign

## Create a workspace

```sh
sah init my-campaign --id my-campaign --title "My Campaign"
sah validate my-campaign
```

The generated workspace validates cleanly, so your first `validate` succeeds
rather than dumping errors you did not cause.

```
my-campaign/
├── campaign.yaml                     the root document
├── missions/first-mission.yaml
├── dialogue/first-conversation.yaml
├── presets/                          night preset manifests
├── assets/                           YOUR OWN assets only
├── Resources/                        files copied into the built mod
├── sah.config.json                   campaign-local config (safe to commit)
└── README.md
```

## The campaign document

```yaml
version: 1
campaign:
  id: my-campaign
  title: My Campaign
  version: 0.1.0
  internalName: MyCampaign # must be valid as a Windows folder name
  description: What this campaign is.
  status: planned # be honest — see below

  compatibility:
    modLauncher: required
    requiredLauncherVersion: '1.27'

  requiredHacks: [custom-files]
  missionFiles: [missions/first-mission.yaml]
  dialogueFiles: [dialogue/first-conversation.yaml]
```

`status` is your own claim about how finished this is. `planned` until something
has actually been tested in the game. It appears in the build manifest, so
overstating it is visible.

## Missions

```yaml
version: 1
mission:
  id: first-mission
  title: First Mission
  gameMissionName: m0 # the script name, e.g. "m0"
  level: level01 # must resolve in the level registry
  resetPlayerInCarLocator: level1-carstart
  status: planned

  stages:
    - id: first-stage
      title: The opening stage
      resetToHere: true
      hudIcon: kwike
      objective:
        type: dummy
```

### Why the objective is `dummy`

`dummy` is currently the **only** objective the toolkit can emit with no
unverified parameters — Donut Team's own Game.lua README uses
`Game.AddObjective("dummy")` verbatim.

Other objectives exist in the game, and the registry knows their names, but most
upstream documentation pages for them read "TODO". Emitting `AddObjective("goto")`
without the call that sets its destination would produce a stage that loads and
can never be completed, so the toolkit refuses:

```
error SAH3000: Objective "goto" is only partially understood: the toolkit knows
the objective name but not the call sequence that configures it.
```

Check what compiles:

```sh
sah registry search objective goto --json   # look at compilerSupport
```

## Referencing game content

Every reference is checked. Search before you write:

```sh
sah registry search character "Comic Book Guy"   # → id: cbg
sah registry search locator level1               # → level1-carstart
sah registry list levels
```

Use the **id**, not the display name. If a search returns nothing, the toolkit
has no evidence the thing exists and your campaign will not build — which is
the point.

## Dialogue

```yaml
version: 1
conversations:
  - id: first-conversation
    title: An opening exchange
    status: planned
    lines:
      - id: line-1
        order: 1
        speaker: bart # checked against the character registry
        text: We should not be out here.
```

Speakers must resolve. Missing audio is a _note_, not an error — text-only
dialogue is fully supported, and you should never extract or redistribute the
game's audio.

A build exports `Resources/dialogue/dialogue.json` plus
`REMAINING-MANUAL-STEPS.md`. The toolkit does not generate a game dialogue file,
because it has not verified those formats and will not guess.

## Raw Game.lua calls

For something the authoring model does not cover, opt in explicitly:

```yaml
mission:
  allowRawGameCommands: true
  stages:
    - id: timed-stage
      objective: { type: dummy }
      rawCommands:
        - command: SetStageTime
          args: [30]
```

Every raw command is still checked against the command registry for existence,
argument count and scope. `SetStageTime` with three arguments is a build error,
not a Lua crash later.

Without `allowRawGameCommands: true`, raw usage is an error — bypassing the
authoring model should be a decision, not an accident.

## Building

```sh
sah validate my-campaign            # exit 0 = ok, 1 = errors
sah build my-campaign --dry-run     # writes nothing
sah build my-campaign               # writes to my-campaign/build/
sah package my-campaign             # deterministic archive
```

Builds are deterministic: identical input produces byte-identical output. Never
edit anything under `build/` — it is regenerated.

Read `build/build-manifest.json`. Its `provenance` section lists every game fact
the build relied on and the source behind it, and `acceptedRisks` lists anything
you forced through despite weak verification.

## When you are blocked on verification

You will be. The locations and vehicles registries are empty.

Options, in order of preference:

1. **Verify the fact** and add it to the registry with a source. See
   [../registries/README.md](../registries/README.md). This helps everyone.
2. **Restructure** to use content that is verified.
3. **Opt in explicitly**, if you have good reason:

   ```yaml
   startingVehicle:
     ref: honor-roller
     allowUnverified: true
     reason: 'Confirmed in my install 2026-08-05; not yet documented publicly.'
   ```

   This warns loudly and is recorded in the manifest.

What you should not do is add a registry record you cannot cite. That converts a
loud failure into a silent one.
