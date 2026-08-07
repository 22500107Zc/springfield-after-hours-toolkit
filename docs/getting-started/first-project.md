# Your first mod project

About five minutes, start to finish. You need the toolkit download and an
editor. **You do not need the game for any of this** — see
[the last section](#what-you-still-need-to-actually-play-it).

---

## 1. Open the toolkit

Extract the download and run the Start Here file:

| Platform | File                 |
| -------- | -------------------- |
| macOS    | `Start Here.command` |
| Windows  | `Start Here.bat`     |
| Linux    | `Start Here.sh`      |

If macOS refuses to open it, that is Gatekeeper doing its job on an unsigned
download — see [Troubleshooting](troubleshooting.md#macos-refuses-to-open-it).

## 2. Run the wizard

```
sah start
```

```console
  Springfield After Hours Toolkit
  Let us make you a new mod project.

  This creates a folder of files you can edit. It does not need the
  game, and it will not change anything until you say yes.
```

It asks five things. Every one has a sensible default — pressing Enter through
all of them gives you a working project.

**Project name.** What players see in the Mod Launcher list. You can change it
later in `Meta.ini`.

**Author name.** A nickname is fine.

**Folder.** Where to create it. Press Enter for the suggestion, or type a path.
On macOS you can drag a folder from Finder into the terminal window.

**Include the example mission?** Say yes while you are learning. It is a
commented Lua file showing how a mission is put together.

**Install editor definitions?** Say yes. This writes autocomplete data _inside
your project folder only_ — nothing is installed on your computer.

## 3. Check the preview

Before writing anything, the wizard shows you exactly what it will do:

```console
  ─────────────────────────────────────────────
  Here is exactly what will happen.
  ─────────────────────────────────────────────

  Project name   Night Shift
  Author         Zach
  Internal name  NightShift

  New folder     /Users/you/Desktop/night-shift

  Files to be created:
      .gitignore
      CustomFiles.ini
      CustomFiles.lua
      Meta.ini
      README.md
      Resources/scripts/example-mission.lua
      .vscode/settings.json          (editor setup)
      Resources/lib/external/…       (Game.* autocomplete)

  Nothing outside that folder will be touched.

Create it [Y/n]:
```

Say `n` and nothing happens at all. Say `y` and it writes those files.

**It will never overwrite an existing folder.** If the folder is already there
and has anything in it, the wizard stops and tells you so, and changes nothing.
There is deliberately no flag to force it.

## 4. Open it in your editor

Install the **Lua Language Server** extension (`sumneko.lua` in VS Code), then
open the project folder.

Open `Resources/scripts/example-mission.lua` and type `Game.` on a new line.
You should get a list of 351 commands. Hover one and you see its argument count
and which scope it has to be inside.

```lua
Game.SelectMission("m0")

	Game.AddStage()
		Game.RESET_TO_HERE()
		Game.AddObjective("dummy")
		Game.CloseObjective()
	Game.CloseStage()

Game.CloseMission()
```

> The example is an **authoring example, not a game-verified mission**. It shows
> the shape of a mission script using commands that genuinely exist in
> `Game.lua`'s own tables. Nobody who built this toolkit has loaded or completed
> it in the game.

If autocomplete does not appear, see
[Troubleshooting](troubleshooting.md#autocomplete-is-not-working).

## 5. Change something

Open `Meta.ini` and edit `Title` and `Description`. That is what the Mod Launcher
shows.

Then try adding a second stage in the example script. The structure — open a
stage, add objectives, close the stage, close the mission — is the thing worth
learning first.

## 6. Check it before you share it

```
sah tools
```

Pick **1. Check filename capitalization**. This catches the single most common
way a mod works for you and breaks for everyone else: a file called
`Scripts/Main.lua` referenced as `scripts/main.lua`. Your Mac does not care.
Linux and the inside of a zip file do.

Then pick **2. Create a clean release copy**. That gives you a folder without
`.DS_Store` and other clutter. **Zip that folder**, not your working one.

---

## What you still need to actually play it

Three things, none of which this toolkit provides or replaces:

1. **A lawful copy of _The Simpsons: Hit & Run_.**
2. **Lucas' Simpsons: Hit & Run Mod Launcher** — Windows only.
3. **`Game.lua`** from [donutteam/game-lua](https://github.com/donutteam/game-lua)
   (MIT), saved as `Resources/lib/Game.lua` inside your project. Your scripts
   call the `Game` table it creates at runtime.

**This toolkit cannot tell you whether your mod works.** It checks that your
files are structurally right and consistent with each other. Only loading the
mod in the Mod Launcher can tell you it runs, and only playing it can tell you
the mission can be finished.

That is not modesty — nothing in this project has ever been run in the game.

---

## Where next

- [The six Pocket Tools](pocket-tools.md), in detail
- [Editor definitions](lua-definitions.md) — how the autocomplete is generated,
  and what it does and does not prove
- [Troubleshooting](troubleshooting.md)
