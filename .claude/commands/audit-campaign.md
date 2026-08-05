---
description: Audit a campaign for unresolved references, unsupported mechanics and honesty problems
argument-hint: '[campaign directory, defaults to examples/springfield-after-hours]'
allowed-tools: Bash(node packages/cli/dist/bin.js:*), Read, Glob, Grep
---

Audit the campaign at `${1:-examples/springfield-after-hours}`.

1. Run `node packages/cli/dist/bin.js validate ${1:-examples/springfield-after-hours} --json`.
2. Group the diagnostics by what they actually mean for the author:
   - **Blocked on verification** — references to game content nobody has confirmed.
     Say precisely which facts are missing and what kind of source would settle it.
   - **Blocked on the toolkit** — objectives that exist in the game but which the
     compiler cannot emit yet.
   - **Author mistakes** — duplicate ids, bad paths, broken stage transitions.
   - **Notes** — things that are fine, like text-only dialogue.
3. Read the campaign's declared `status` and say whether it is honest given what
   you found. A campaign claiming `verified` while failing validation is a
   problem worth flagging.

Do not propose registry additions to make errors go away. If a locator is
missing, the fix is to find a citable source for it, not to invent one.
