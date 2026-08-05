# Contributing

Thank you for considering it. This project is useful in direct proportion to how
much verified game knowledge is in it, so contributions of _facts_ matter as much
as contributions of code.

## The one rule

**Never add a game fact you cannot cite.**

Not a locator name you are fairly sure of, not a vehicle code you saw once, not
an objective parameter you inferred from a similar game. If a record cannot point
at a source, it does not go in — because the whole value of this toolkit is that
a build failure means something.

A pull request adding a record with `sourceType: guess` will be declined, kindly
but firmly.

## What is most useful right now

In rough order of value:

1. **Locators.** The registry has four, all from documentation examples. Almost
   every interesting mission needs locators the toolkit has never heard of. This
   is the single biggest blocker.
2. **Vehicle internal names.** The registry has zero. Not even the Honor Roller,
   which the flagship campaign needs.
3. **Objective parameters.** Most objective pages upstream read "TODO", which is
   why `goto` and `talkto` refuse to compile. Documenting their call sequences
   would unblock real missions.
4. **In-game verification.** Someone with Windows, the game and the Mod Launcher
   confirming that a generated mod actually loads would be enormously valuable —
   including, especially, if it does not.
5. Code: toolkit features from [ROADMAP.md](ROADMAP.md).

## Adding a registry record

1. **Find a source.** In descending order of weight:
   - official Donut Team documentation (`docs.donutteam.com`)
   - upstream source at a pinned commit (`github.com/donutteam`)
   - a file from your own game or mod installation, described precisely
   - a community forum or wiki post → status `community-reported`
   - your own observation while playing → status `manual-observation`

2. **Record the source** in `data/provenance/sources.yaml` if it is not there:

   ```yaml
   - id: dt-docs-some-page
     type: official-documentation
     title: 'Some Page | DT Docs'
     url: https://docs.donutteam.com/docs/...
     publisher: Donut Team
     retrievedAt: '2026-08-05'
   ```

3. **Add the record** to the right file in `data/registries/`:

   ```yaml
   - id: some-locator
     displayName: some_locator
     gameCode: some_locator
     category: npc-placement
     level: level01
     verificationStatus: verified
     verifiedAt: '2026-08-05'
     provenance:
       sources: [dt-docs-some-page]
       detail: 'Quote or describe exactly where in the source this appears.'
     notes:
       - 'Anything a reader should know about the limits of this claim.'
   ```

4. **Pick the status honestly.** `verified` means a source states it directly.
   If you are inferring, it is `community-reported` or `unverified`, and saying
   so is a contribution rather than a weakness.

5. **Run `npm run lint && npm test`.** `sah registry validate` will confirm the
   record loads and its provenance resolves.

### Two registries you must not hand-edit

`data/registries/commands.yaml` and `data/registries/characters.yaml` are
**generated** from upstream. Edit `scripts/research/*.mjs` and regenerate; CI
fails if they drift from upstream.

## Code contributions

```sh
npm install
npm run build
npm test
npm run lint
npm run format:check
```

All five must pass. CI runs them on Linux, macOS and Windows against Node 20 and 22.

Conventions:

- Strict TypeScript. No `any`, no non-null assertions outside tests.
- ESM with explicit `.js` extensions on relative imports.
- Dependencies flow downward through the package graph in
  [ARCHITECTURE.md](ARCHITECTURE.md). If you need to reverse an arrow, discuss it
  first.
- Comments explain _why_ — a constraint, a decision, a non-obvious consequence.
  Not what the next line does.
- New diagnostic codes need an entry in `DIAGNOSTIC_HELP`. A test enforces this,
  because a diagnostic you cannot get an explanation for is a dead end.

## Testing

- No test may require a game installation, an API key, or network access.
- New validation rules need a fixture in `fixtures/invalid/` demonstrating the
  failure.
- If you change generated output, update the assertions in
  `packages/compiler/test/build.test.ts` deliberately — those are the golden
  fixtures.

Note that `examples/springfield-after-hours` **is expected to fail validation**,
and CI fails if it ever starts passing. If your change makes it pass, either you
have added registry records without provenance or the verification gate has
broken. Both are regressions.

## What must never be committed

- The game, or any part of it
- Game assets: models, textures, audio, video, map data, scripts
- Assets from any third-party community mod
- API keys, tokens, credentials
- Vendored upstream code (it is fetched into git-ignored `vendor/`)

CI enforces these. If you need a binary fixture for a test, ask first.

## Pull requests

Explain what you verified and how. For a registry addition, quote the source
text you relied on, so a reviewer can check your reading without repeating your
search.

Small, focused pull requests get reviewed faster. A single well-sourced locator
is a genuinely welcome contribution.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
