---
description: Research whether a capability is actually supported, without fabricating an answer
argument-hint: '<capability description>'
allowed-tools: Bash(node packages/cli/dist/bin.js:*), Read, Grep, WebFetch, WebSearch
---

Research whether this is possible: $ARGUMENTS

1. Check the capability matrix first: `node packages/cli/dist/bin.js registry search preset-capability "$ARGUMENTS" --json`
   and read `docs/CAPABILITY_MATRIX.md`.
2. If it is not recorded, research it against **official sources only** —
   docs.donutteam.com and the donutteam GitHub organisation. Community forum
   posts may be cited but must be labelled `community-reported`.
3. Report one of:
   - **verified** — with the exact source, and what it does and does not cover
   - **community-reported** — with the source and the caveat
   - **unverified** — you could not find anything either way
   - **unsupported** — you found positive evidence it does not work

Never answer from general knowledge about other games. "GTA does this" is not
evidence about _The Simpsons: Hit & Run_.

If you establish something new, propose the registry record with its provenance
entry — but show it to the user rather than writing it yourself.
