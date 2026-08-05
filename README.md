# Springfield After Hours Toolkit

A provenance-first toolkit for authoring Simpsons: Hit & Run campaign mods without guessing game content or redistributing copyrighted assets.

The current MVP provides strict YAML schemas, searchable registries, cross-reference validation, deterministic build previews/output, a TypeScript CLI, and a read-only local MCP server. Generated mission Lua is deliberately labeled as a compiler fixture—not a playable claim—until the upstream Game.lua adapter is pinned and verified.

## Requirements and quick start

Node.js 20+ and npm are required.

```sh
npm install
npm run ci
npm run sah -- validate examples/minimal-campaign/campaign.yaml
npm run sah -- build examples/minimal-campaign/campaign.yaml -o build/minimal
```

Use `npm run sah -- --help` to see available commands. Commands whose implementation is not verified fail explicitly without writing fake output.

## Safety boundary

This repository contains no original game files, mod assets, extracted audio, or Fully Connected Map content. Builds write only to the selected output directory and never modify the game directory. Unknown registry references are errors.

See [architecture](docs/architecture/overview.md), [authoring guide](docs/getting-started/authoring.md), [MCP setup](docs/getting-started/mcp.md), and [roadmap](docs/architecture/roadmap.md).
