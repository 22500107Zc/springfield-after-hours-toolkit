# Research

- **[../RESEARCH_LOG.md](../RESEARCH_LOG.md)** — what has been verified, from
  which source, and what each source did _not_ establish. Append-only.
- **[../CAPABILITY_MATRIX.md](../CAPABILITY_MATRIX.md)** — the conclusions, in
  table form.

## Tools

Two scripts derive registry data from upstream rather than transcribing it,
which is why the derived records are correct:

```sh
npm run registry:derive-commands                            # parses upstream Game.lua
node scripts/research/derive-command-registry.mjs --check    # CI drift check
node scripts/research/derive-character-registry.mjs          # parses Donut Team's docs
```

Both write a header naming the source and commit they derived from.

## Doing research

The method that worked, and is worth repeating:

1. **Prefer machine-readable sources.** `Game.lua`'s command tables gave 339
   commands with exact argument counts. Reading the same information out of
   prose documentation would have introduced errors.
2. **Record what a source does not say.** The objective _names_ are documented;
   the parameters mostly are not. Capturing that distinction is what lets the
   compiler refuse `goto` for a specific, explainable reason.
3. **Write the citation down immediately**, with the retrieval date. A fact
   without a source cannot go in the registry, so an uncited note is wasted work.
4. **Never fill a gap by inference.** "The Honor Roller is probably `honor_v`"
   is the exact failure mode this project exists to prevent.

## Open questions

Listed at the end of [../RESEARCH_LOG.md](../RESEARCH_LOG.md). The most valuable
are vehicle internal names, locators, objective parameters, and whether a
generated mod actually loads in the game.
