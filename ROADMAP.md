# Roadmap

Honest status labels throughout. "Done" means implemented and tested, not
verified in the game — nothing in this repository has been run in the game yet.

## Where things stand

The toolkit can take a campaign from YAML to a Mod Launcher mod folder, and it
refuses to do so when the campaign references content it cannot verify. What it
cannot yet do is tell you whether the result actually works, because nobody has
run it.

The gap is not code. It is **verified game facts** — locators and vehicle names
above all — and **objective parameter documentation**.

## Milestone 1 — Foundation ✅ done

- npm workspace monorepo, strict TypeScript, ESM
- Verification vocabulary and provenance model
- Registry loading, indexing and search; 487 seeded records
- Command registry derived mechanically from upstream `Game.lua`
- Character registry derived from Donut Team's published table
- Validator with 30 diagnostic codes
- Deterministic compiler producing `Meta.ini`, `CustomFiles.ini`,
  `CustomFiles.lua` and Game.lua mission scripts
- Build manifest with hashes and provenance
- `sah` CLI, 16 commands, tested exit codes
- Local MCP server, 12 sandboxed tools
- Optional AI package: guardrails and proposal validation
- 163 tests, CI on three platforms and two Node versions

## Milestone 2 — First verified mission 🔜 next

The single most valuable next step, and it needs someone with the game.

- [ ] Verify the Honor Roller's internal vehicle name from a citable source
- [ ] Verify locators for at least one real Springfield location
- [ ] Document the `goto` objective's parameters, so it can compile
- [ ] Document the `talkto` objective's full call sequence
- [ ] Build a mission from verified content and **load it in the game**
- [ ] Record the result — including failures — in `docs/RESEARCH_LOG.md`

Until this lands, every campaign the toolkit builds is a compiler fixture.

## Milestone 3 — Dialogue that reaches the game

- [ ] Verify how dialogue text resources are actually structured
- [ ] Generate `CustomDialogueCharacterCodes.ini` for original characters
- [ ] Verify `SetDialogueInfo` semantics
- [ ] Replace the "remaining manual steps" report with real generation

Currently dialogue is exported as structured JSON plus an explicit report of
what the author must still do by hand. That is deliberate — guessing at a binary
format would produce a file that either fails to load or silently plays nothing.

## Milestone 4 — AI integration completed

- [ ] Interactive diff-and-confirm before any model proposal is written
- [ ] `sah ai plan`, `scaffold-mission`, `explain-error`, `audit` fully wired
- [ ] Mocked integration tests
- [ ] Per-project spend tracking

The parser, registry-reference checker, spending safeguards and redaction are
done. The review gate is what is missing, and the commands refuse to run without
it rather than writing unreviewed output.

## Milestone 5 — Night presets that do something

- [ ] Establish what a mod can actually change about level lighting
- [ ] Verify whether fog parameters are controllable at all
- [ ] Implement traffic and pedestrian density generation, which _are_ verified
      as commands
- [ ] Document the external-tool path for VHS-style post-processing honestly

Presets are design manifests today. Each setting carries its own support status,
and most are `planned` or `unverified`.

## Milestone 6 — Connected-map compatibility

- [ ] Populate the Fully Connected Map profile from a real installation
- [ ] Inspect user-supplied mod configuration without copying assets
- [ ] Conflict detection between campaign and external mod

Requires someone with the mod installed. Its assets must never enter this
repository.

## Milestone 7 — Pure3D adapter

- [ ] Adapter boundary over `pure3d-ts`
- [ ] Identify and validate P3D references in campaigns
- [ ] Read safe metadata
- [ ] Fixtures before any transformation is written

Deliberately last. Destructive P3D transformations without fixtures would be
reckless.

## Milestone 8 — Plugins

- [ ] Sandbox for plugin validators
- [ ] Provenance attribution for plugin-contributed records
- [ ] Conflict policy against built-in records
- [ ] Explicit per-project opt-in

The contract is typed and the security requirements are documented. No loader
exists, so no third-party code runs.

## Later

- A visual editor consuming the same APIs (core and CLI were built first so this
  stays possible)
- Localization workflow
- Campaign templates beyond the minimal fixture

## Explicitly out of scope

These are not "later" — they are things the game does not do, and the toolkit
will not pretend otherwise:

- Day/night cycles or a simulated clock
- Weather simulation
- Dynamic NPC schedules
- Persistent open-world damage
- In-engine cinematic cutscenes
- Runtime HTTP requests from a mod
- AI-generated missions during gameplay
- Unrestricted save-state modification

See `data/registries/preset-capabilities.yaml` and
[docs/CAPABILITY_MATRIX.md](docs/CAPABILITY_MATRIX.md).
