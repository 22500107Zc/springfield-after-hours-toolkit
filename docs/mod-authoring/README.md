# Mod authoring

Start with **[../getting-started/authoring.md](../getting-started/authoring.md)**,
which walks through creating a workspace, writing missions and dialogue, and
building.

Then:

- [../registries/README.md](../registries/README.md) — how to reference game
  content, and how to add a verified record when the thing you need is missing
- [../CAPABILITY_MATRIX.md](../CAPABILITY_MATRIX.md) — what is possible before
  you design around it
- [../getting-started/mcp.md](../getting-started/mcp.md) — using the toolkit
  from Claude Code

## Worked examples in this repository

| Example                            | Builds?           | What it shows                                                                                   |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `examples/minimal-campaign`        | **yes**           | The smallest campaign that compiles. A compiler fixture, not a playable mission.                |
| `examples/springfield-after-hours` | **no, by design** | Story data whose geography is unverified. Its validation failures are the project's to-do list. |

Reading both, in that order, is the fastest way to understand what the toolkit
will and will not do for you.

## The generated output

A build produces an ordinary Mod Launcher mod folder. Nothing about it is
magic — you can read every file, and the build manifest tells you which source
produced each one and which game facts it relied on.

Never edit generated files. Edit the source YAML and rebuild.
