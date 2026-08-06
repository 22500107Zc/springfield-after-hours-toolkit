# Game.meta.lua — Springfield After Hours Toolkit

Lua Language Server definitions for the `Game.*` mission-script commands that
Donut Team's `Game.lua` creates **at runtime**.

> This file is attached to a GitHub Release. The counts and pinned commit below
> describe **the release it shipped with** — check `SHA256SUMS.txt` beside it,
> and the header inside `Game.meta.lua` itself, for the authoritative values.

Attached to this release so you can use editor autocomplete without cloning the
repository.

## Install by hand

1. Drop `Game.meta.lua` somewhere in your mod project, e.g.
   `Resources/lib/external/sah-game-lua-definitions/Game.meta.lua`
2. Point the Lua Language Server at it, in `.vscode/settings.json`:

```json
{
  "Lua.runtime.version": "Lua 5.3",
  "Lua.workspace.library": ["Resources/lib/external/sah-game-lua-definitions"]
}
```

Or let the toolkit do it, which also installs Donut Team's official Custom
Files definitions and preserves any settings you already have:

```sh
sah lua-defs install ~/path/to/your-mod --with-official --apply
```

## What you get

**351 completions** — 339 commands, their 10 `Not_` inverses, and `Game.EndIf`
/ `Game.Not`. Hover documentation carries each command's required scope and
argument range. Argument counts are genuinely enforced: LuaLS's
`missing-parameter` and `redundant-parameter` are both on by default, and the
generated signatures encode both bounds.

## What this does NOT prove

Completion and argument-count checking reflect `Game.lua`'s own command tables.
**They do not prove a script works in the game.**

- Argument **meanings and types** are undocumented upstream, so every parameter
  is `argN: any`. That is a refusal to guess, not a placeholder.
- **Scope rules are documentation only.** A language server cannot know where in
  an emitted script a call lands. `sah validate` does enforce scope.
- Nothing in this release has been run in the game.

## Provenance

Generated mechanically from `data/registries/commands.yaml`, itself derived by
parsing the `DefaultCommands`, `ASFCommands` and `DebugTestCommands` tables in:

- Repository: <https://github.com/donutteam/game-lua>
- Pinned commit: `74f8059127bcd9555e6417d9b0b4f5dcef5b9a22`
- Source file: `src/Game.lua`
- Source SHA-256: `a382b01ef5e1d8a2c9ed0ff0fab10156f33b083d232eb9d392977cfb8181a128`
- Upstream licence: MIT — Copyright (c) 2022 Donut Team

This file contains **derived metadata** — command names, argument counts and
scope rules — not upstream source code. `Game.lua` itself is not redistributed
here. The full header inside `Game.meta.lua` repeats all of this.

Never execute this file. It is a `---@meta` definition file and it raises an
error if run.

## Licence

MIT, © the Springfield After Hours Toolkit contributors. Unofficial fan project,
not affiliated with Electronic Arts, Disney, Fox, Radical Entertainment or
Donut Team.
