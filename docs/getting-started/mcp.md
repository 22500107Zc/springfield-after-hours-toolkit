# Using the toolkit from Claude Code

The repository ships a local MCP server so Claude Code uses the toolkit's real
validation and compilation instead of guessing at YAML and editing files blind.

## Setup

```sh
npm install
npm run build
```

`.mcp.json` in the repository root already declares the server:

```json
{
  "mcpServers": {
    "springfield-after-hours-toolkit": {
      "command": "node",
      "args": ["packages/mcp-server/dist/bin.js"],
      "env": { "SAH_WORKSPACE": "${workspaceFolder}" }
    }
  }
}
```

Open the repository in Claude Code and approve the project MCP server when
prompted. Confirm it is connected with `/mcp`.

To register it manually, or for a campaign living outside this repository:

```sh
claude mcp add springfield-after-hours-toolkit \
  -- node /path/to/toolkit/packages/mcp-server/dist/bin.js --workspace /path/to/campaign
```

Run it directly for debugging (it speaks JSON-RPC on stdout, so it will look
inert until a client connects):

```sh
npm run mcp
```

## Tools

| Tool                        | What it does                                                             |
| --------------------------- | ------------------------------------------------------------------------ |
| `search_registry`           | Search verified game content. **Call this before referencing anything.** |
| `get_registry_record`       | One record with full provenance                                          |
| `list_supported_objectives` | Objectives, with whether the compiler can emit each one                  |
| `get_capability_status`     | Whether a proposed feature is actually supported                         |
| `validate_campaign`         | Full validation, structured diagnostics                                  |
| `validate_mission`          | One mission file in isolation                                            |
| `compile_campaign`          | Validate and compile; **dry run by default**                             |
| `preview_generated_files`   | Full contents of what a build would write                                |
| `explain_diagnostic`        | What a code means and how to fix it                                      |
| `create_mission_scaffold`   | Returns mission YAML — does not write it                                 |
| `create_dialogue_scaffold`  | Returns dialogue YAML, speakers checked                                  |
| `run_toolkit_doctor`        | Environment status                                                       |

## Security boundary

The caller of an MCP tool is a language model, so its inputs get the scrutiny of
untrusted input:

- **Workspace confinement.** Every path resolves against one root. Traversal,
  absolute paths in both POSIX and Windows flavours, UNC prefixes and null bytes
  are refused with an explanation.
- **Game installation off limits.** A configured `gamePath`, `modLauncherPath`
  or `connectedMapPath` goes on a forbidden list, so no tool reaches it even by
  accident.
- **No tool writes files.** Scaffolding tools _return_ content; Claude Code
  writes it through its normal reviewed edit flow, so nothing is modified
  without you seeing it.
- **`compile_campaign` defaults to a dry run.**
- **No secrets.** No tool returns environment variables. `run_toolkit_doctor`
  reports whether an API key is present, never its value.

`.claude/settings.json` additionally denies writes to the two generated registry
files and to `vendor/`, and denies reads of `.env` and `*.key`.

## Slash commands

| Command                              | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `/search-verified <kind> <query>`    | Check what exists before referencing it            |
| `/audit-campaign [dir]`              | Group diagnostics by what they mean for the author |
| `/explain-error <code>`              | Explain a diagnostic in context                    |
| `/scaffold-mission <id> [dir]`       | Scaffold using only verified content               |
| `/build-and-diff [dir]`              | Build and explain how source became output         |
| `/research-capability <description>` | Research a capability without fabricating          |

There is also a `registry-researcher` subagent for verifying game facts against
official sources and returning a record with provenance — or an honest
"not found".

## What to expect

Claude Code will refuse to invent game content, because the tools are built to
make refusing the easy path. Ask for "a mission where Bart drives the Honor
Roller to the Java Server" and you should get an explanation that neither the
vehicle nor the location is verified, rather than a mission file full of
plausible names that fails to build.

That is the system working. The fix is to verify the facts — see
[../registries/README.md](../registries/README.md).
