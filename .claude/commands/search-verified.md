---
description: Search the verified game-content registries before referencing anything
argument-hint: '<kind> <query>   e.g. character "Comic Book Guy"'
allowed-tools: Bash(node packages/cli/dist/bin.js:*)
---

Search the registries for: $ARGUMENTS

Run `node packages/cli/dist/bin.js registry search $ARGUMENTS --json` and report:

- what was found, with its **registry id** (the id is what goes in campaign YAML,
  not the display name)
- its verification status
- the source that justifies it

If nothing is found, say so plainly and stop. An empty result means the toolkit
has no evidence the thing exists — it is not an invitation to guess a name, and
a campaign referencing it will not build.
