# Legal notes

## Summary

This is an **unofficial fan project**. It is not affiliated with, endorsed by,
or sponsored by Electronic Arts, Disney, Fox, Radical Entertainment or Donut
Team.

The repository's original code and data are MIT licensed. See
[LICENSE](../../LICENSE) and [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## What is never in this repository

- The game, or any part of it
- Game assets: models, textures, audio, video, map data, scripts
- Dialogue audio extracted from the game
- Proprietary map files
- Assets from Fully Connected Map, Full Game Plus, or any other community mod
- Credentials of any kind

CI enforces the asset and credential rules on every push.

## Facts versus content

The registries record **identifiers and their meanings** — that the dialogue
code for Comic Book Guy is `Cbg`, that `AddStage` takes 0-7 arguments. These are
facts about how a piece of software works, recorded with a citation to where
they were published.

That is different from copying content. The toolkit does not reproduce Donut
Team's documentation, and it does not ship game data.

## Upstream code

Donut Team's `Game.lua` is MIT licensed, so vendoring it would be permitted.
This repository fetches it instead, from a pinned commit into a git-ignored
directory, with its licence file. Three reasons: the repository stays free of
third-party code, the pin is verifiable by hash rather than trusted, and
upstream keeps ownership of its own distribution.

`mfk-to-lua` is GPL-3.0 and is referenced only as a separate external tool. No
code from it is used, linked or derived here, so this repository's MIT licence is
unaffected.

## If you distribute a campaign

Ship only your own work and things you have the right to distribute. Your mod
must not contain game files, extracted audio, or assets from someone else's mod
without their permission.

`sah package` prints a reminder for exactly this reason.

## Trademarks

_The Simpsons_ and _The Simpsons: Hit & Run_ are trademarks of their respective
owners. This project uses those names only to describe what it is compatible
with. No official logos or copyrighted art are used anywhere in this repository.
