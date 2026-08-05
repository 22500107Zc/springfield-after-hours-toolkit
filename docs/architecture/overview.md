# Architecture

The dependency flow is `schemas → registry → validator → compiler`, with the CLI and MCP server as controlled interfaces. Schemas own the authoring model. Registries own provenance-backed facts. Validation blocks unknown or unsupported references. The compiler consumes only validated data and sorts output paths for repeatability.

Adapters for Game.lua, Lucas Mod Launcher definitions, Pure3D, AI, and plugins remain separate roadmap packages so unverified behavior cannot leak into the core.
