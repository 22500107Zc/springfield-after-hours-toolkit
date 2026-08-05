---
description: Scaffold a mission using only verified game content
argument-hint: '<mission-id> [campaign directory]'
allowed-tools: Bash(node packages/cli/dist/bin.js:*), Read, Write, Edit
---

Scaffold a mission with id `$1` in `${2:-.}`.

Before writing anything:

1. Search the registry for every piece of game content the mission needs.
2. If any of it is unverified, say so and either drop it from the mission or
   stop and ask. Do not write a mission you already know will fail validation
   without saying that up front.

Then:

3. Run `node packages/cli/dist/bin.js mission new $1 -C ${2:-.}`.
4. Add the file to `campaign.missionFiles`.
5. Run validate and report the result.

The scaffold uses the `dummy` objective because that is the only objective the
compiler can emit with no unverified parameters. Only replace it if
`registry search objective` shows `compilerSupport: supported`.
