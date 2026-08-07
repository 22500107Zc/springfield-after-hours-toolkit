# Troubleshooting

Every command accepts `--debug` for technical detail. Without it you get a short
plain-language message, because a stack trace usually makes people think they
broke something when they did not.

---

## macOS refuses to open it

> "sah" cannot be opened because it is from an unidentified developer.
> Apple could not verify "sah" is free of malware.

**This is expected.** The download is **not signed with an Apple developer
certificate and has not been notarized.** macOS blocks unsigned downloads by
default, and it is right to.

To allow this one file:

1. **System Settings** → **Privacy & Security**.
2. Scroll to the message about `sah`.
3. Click **Open Anyway**.
4. Run **Start Here.command** again.

Or from Terminal, in the extracted folder:

```sh
xattr -d com.apple.quarantine ./sah
./sah start
```

**Never turn Gatekeeper off system-wide** (`spctl --master-disable`). You do not
need to, and it protects everything else you download.

## Windows says "Windows protected your PC"

Same reason — the executable is not code-signed. Click **More info**, then
**Run anyway**.

## "Permission denied" on macOS or Linux

The executable bit was lost, usually by extracting with a tool that drops it:

```sh
chmod +x ./sah
./sah start
```

If you extracted the `.tar.gz` by double-clicking and this keeps happening, try
extracting from a terminal instead:

```sh
tar -xzf sah-0.1.1-macos-apple-silicon.tar.gz
```

## Which Mac download do I need?

Apple menu → **About This Mac**.

- **Apple M1 / M2 / M3 / M4** → Apple Silicon
- **Intel** → Intel

The wrong one will not run. Nothing is damaged; download the other.

## "That folder already exists and is not empty"

The wizard will not write into a folder that has anything in it, and there is no
flag to force it. **Nothing was changed.**

Either choose a different name, or delete that folder yourself if you are sure
you do not need what is in it.

## Autocomplete is not working

1. Is the **Lua Language Server** extension installed? In VS Code it is
   `sumneko.lua`. The toolkit writes the definitions; the extension reads them.
2. Did you open the **project folder** itself, rather than a folder above it?
   The settings live in `.vscode/settings.json` inside the project.
3. Re-install the definitions:

   ```sh
   sah definitions install .
   ```

4. Reload your editor window.

If `Game.` gives you nothing, check that
`Resources/lib/external/sah-game-lua-definitions/Game.meta.lua` exists in your
project.

## Autocomplete works, but is my script correct?

Autocomplete checks two things: that the command exists, and that you passed the
right _number_ of arguments.

It does **not** check that a call is in the right place, and it cannot check
what the arguments _mean_ — those are `any` because no source this project has
read documents them.

**Nothing this toolkit does proves a script works in the game.** Only the Mod
Launcher can tell you that.

## The "official definitions" download failed

`sah start` and `sah definitions install --with-official` can fetch Donut Team's
Custom Files definitions. That step needs an internet connection and verifies
each file against a recorded fingerprint.

If it fails, your project is still fine — the `Game.*` autocomplete is separate
and already installed. Retry later with:

```sh
sah definitions install . --with-official
```

It refuses to install a partial set rather than leaving you with half the files.

## "Potential file conflicts" — is my mod broken?

Not necessarily. `sah tools` → option 3 reports paths that more than one mod
supplies. That is a thing to look at, not a verdict.

This toolkit compares files. It does not know what the game or the Mod Launcher
does when two mods overlap — load order and override behaviour are not
documented in any source it has read. Two overlapping mods may work together
fine; two mods that do not overlap at all can still break each other.

## A command exited with 1 and I do not know why

Exit code **1 means "found something", not "failed"**:

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| 0    | Ran, found nothing to report                                         |
| 1    | Ran, found something — collisions, conflicts, differences            |
| 2    | Could not run — a path was missing, unusable, or outside the project |
| 70   | An unexpected internal error                                         |

`sah pocket diff` returns 1 whenever two releases differ, which is the normal
case.

## Something crashed

Run it again with `--debug` and
[open an issue](https://github.com/22500107Zc/springfield-after-hours-toolkit/issues)
with that output. A crash is a bug in the toolkit, not something you did.

## Can I use this without the game?

Yes — everything on this page and in the toolkit works with no game installed.

You need a lawful copy of the game, Lucas' Mod Launcher, and Donut Team's
`Game.lua` only when you want to _run_ a mod. This toolkit prepares files; it
does not play them.
