# Editor autocomplete for Game.lua mission scripts

Writing a mission script means calling things like `Game.AddStage()` and
`Game.SetStageTime(20)`. By default your editor knows nothing about any of them,
because Game.lua creates the `Game` table **at runtime** — it loops over a
command table and installs a closure per command, so there is no declaration in
the source for an editor to read.

This package generates that declaration.

---

## The two halves, and why you want both

Donut Team already publishes Lua Language Server definitions. They are good, and
this package does **not** duplicate or replace them. The two cover different
halves of what a mod author writes:

|                      | Donut Team's `lucas-mod-launcher-lua`                                                                                                  | This package                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Covers**           | The Custom Files Lua API                                                                                                               | The `Game.*` mission commands                                                                                      |
| **Examples**         | `Output`, `Redirect`, `GetPath`, `GetModPath`, `ReadFile`, `GetSetting`, `IsHackLoaded`, `GetCurrentLevel`, custom save data, `Dialog` | `Game.SelectMission`, `Game.AddStage`, `Game.AddObjective`, `Game.SetStageTime`, `Game.CloseMission`, and 334 more |
| **Where you use it** | `CustomFiles.lua` and path handler scripts                                                                                             | The mission/level scripts a path handler generates                                                                 |
| **Files**            | `LuaFunctions/*.meta.lua`, `LuaTables.meta.lua`                                                                                        | `Game.meta.lua`                                                                                                    |
| **Source of truth**  | Hand-written by Donut Team                                                                                                             | Generated from Game.lua's own command tables                                                                       |

Install both. With only Donut's, `Game.AddStage` is an unknown global. With only
this one, `GetModPath` is.

---

## Install it on a Mac

Copy and paste these, in order. Nothing here touches your game installation.

**1. Get the toolkit and build it**

```sh
git clone https://github.com/22500107Zc/springfield-after-hours-toolkit.git
cd springfield-after-hours-toolkit
npm install
npm run build
```

**2. See what will happen to your mod project** — this writes nothing:

```sh
node packages/cli/dist/bin.js lua-defs install ~/path/to/your-mod --with-official
```

You will get a list like `create …/Game.meta.lua` and
`merge .vscode/settings.json`, with a note on each line saying exactly what
changes.

**3. Apply it when the plan looks right:**

```sh
node packages/cli/dist/bin.js lua-defs install ~/path/to/your-mod --with-official --apply
```

**4. Open the project in VS Code** and install the
[Lua extension by sumneko](https://marketplace.visualstudio.com/items?itemName=sumneko.lua).

That is it. Type `Game.` in a mission script and you should get 351 completions:
339 commands, their 10 `Not_` inverses, and `Game.EndIf()` and `Game.Not()`,
which Game.lua defines outside its command tables.

### Windows and Linux

Identical, except for how you write the path:

```sh
# Windows (PowerShell)
node packages\cli\dist\bin.js lua-defs install C:\mods\your-mod --with-official --apply

# Linux
node packages/cli/dist/bin.js lua-defs install ~/mods/your-mod --with-official --apply
```

The generated `Game.meta.lua` is plain text with LF endings and no
platform-specific content, so the same file works everywhere.

---

## What `install` does to your project

```
your-mod/
├── .vscode/settings.json                                    ← merged, never overwritten
└── Resources/lib/external/
    ├── sah-game-lua-definitions/Game.meta.lua               ← this package
    └── lucas-mod-launcher-lua/                              ← Donut Team's, MIT
        ├── LICENSE.md
        ├── LuaTables.meta.lua
        └── LuaFunctions/*.meta.lua
```

Settings added:

```json
{
  "Lua.runtime.version": "Lua 5.3",
  "Lua.workspace.library": [
    "Resources/lib/external/sah-game-lua-definitions",
    "Resources/lib/external/lucas-mod-launcher-lua"
  ]
}
```

**Your existing settings are safe.** The command merges rather than overwrites:
unrelated keys are left alone, `Lua.workspace.library` is a union with whatever
you already had, and if you have already chosen a different
`Lua.runtime.version` it is left as-is with a note rather than silently changed.
If `settings.json` exists but is not valid JSON, the command refuses to touch it
at all.

Nothing is written until you pass `--apply`.

### About `--with-official`

That flag downloads Donut Team's definitions **into your mod project**, from a
pinned commit, and verifies every file against a recorded SHA-256 before writing
it. A hash mismatch or a failed download aborts the whole install rather than
leaving you with a partial set. Their `LICENSE.md` is installed alongside the
files it covers.

Those files are never committed into this repository — this toolkit does not
redistribute them.

---

## What you get in the editor

Hover over any `Game.*` call and you see:

```
Emits the `AddStage` script command.

Scope: must appear inside a `Mission` scope.
Opens scope: `Stage`.
Arguments: takes 0–7 arguments.
Provided by: the base game.

Argument names and types are NOT documented upstream, so every parameter is `any`.
```

### What the language server actually enforces

Both of these diagnostics are **on by default** in LuaLS:

| Check              | Enforced? | How                                              |
| ------------------ | --------- | ------------------------------------------------ |
| Command exists     | **yes**   | A typo like `Game.AddStge` is an undefined field |
| Too few arguments  | **yes**   | `missing-parameter`, from required params        |
| Too many arguments | **yes**   | `redundant-parameter`, from the declared maximum |
| Argument _types_   | no        | Every parameter is `any` — see below             |
| **Scope rules**    | **no**    | Documentation only — see below                   |

Arity is expressed with optional parameters. `AddStage` accepts 0–7, so all
seven parameters are marked `?`; `SetStageTime` accepts exactly 1, so its single
parameter is required. That gives you both bounds from one signature.

### What is documentation only

**Scope rules are not enforced.** The definitions say `AddStage` must be inside
a `Mission` scope, but a language server analyses declarations, not the runtime
nesting your script produces. It cannot know where in the emitted script a call
lands.

The toolkit _does_ enforce scope — in the compiler, when it generates a mission
from campaign YAML, and in `sah validate`. If you want scope checked rather than
merely documented, author the mission as YAML and let the compiler emit the Lua.

**Argument types and names are not modelled.** They are `arg1: any`,
`arg2: any`, and so on, because no source this project has read documents what
the arguments to these commands mean. A guessed name would look authoritative
and be wrong, so the file says nothing rather than something plausible.

---

## Keeping it current

The definitions are generated from the command registry, which is itself derived
from a pinned commit of Game.lua. The pin is in
[`data/upstream/upstream.lock.json`](../../data/upstream/upstream.lock.json), and
the generated file's header records the commit and the source file's SHA-256.

```sh
# Regenerate after the registry or the pin changes
node packages/cli/dist/bin.js lua-defs generate

# Verify: every command covered, nothing invented, arity and scope match,
# artifact current, upstream pin current
node packages/cli/dist/bin.js lua-defs check
```

`lua-defs check` runs in CI, so the definitions cannot silently drift away from
the registry or from upstream.

When Game.lua releases a new version, the sequence is: update the pin, re-derive
the command registry, regenerate the definitions, re-run `lua-defs check`.

---

## What this does not prove

Autocomplete is not verification.

A script can be completely clean in your editor — every command spelled right,
every argument count correct — and still fail in the game, because the _meanings_
of those arguments are undocumented and because the language server cannot check
where a call ends up in the emitted script.

These definitions make it much harder to write a script that is obviously wrong.
They do nothing to prove one is right. That still requires testing in Lucas'
Simpsons: Hit & Run Mod Launcher, which is a Windows application; on a Mac you
need a Windows machine, a VM, or a Wine-based runtime.

---

## Credits

`Game.lua` is by **Donut Team**, MIT licensed, Copyright (c) 2022 Donut Team.
This package generates editor metadata _about_ it — command names, argument
counts and scope rules read out of its own command tables — and does not
redistribute the library itself.

The Custom Files definitions installed by `--with-official` are also Donut
Team's, MIT licensed, and are installed unmodified with their licence file.
