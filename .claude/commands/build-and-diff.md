---
description: Build a campaign and compare the generated output against its source
argument-hint: '[campaign directory, defaults to examples/minimal-campaign]'
allowed-tools: Bash(node packages/cli/dist/bin.js:*), Read
---

Build `${1:-examples/minimal-campaign}` as a dry run and explain the output.

1. Run `node packages/cli/dist/bin.js build ${1:-examples/minimal-campaign} --dry-run --json`.
2. For each generated file, explain which source produced it and why it looks
   the way it does. In particular:
   - which `Meta.ini` keys came from which campaign fields
   - how each `[PathHandlers]` entry maps a game script request to generated Lua
   - how each authored stage became `Game.*` calls
3. Read the build manifest's `provenance` section and state which sources the
   build ultimately relied on.
4. Report anything in `acceptedRisks`. Those are references the author forced
   through despite weak verification, and they deserve to be surfaced.
