import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from '@sah/core';
import { createSandbox, SandboxViolation, type Sandbox } from './sandbox.js';
import { TOOLS, createToolContext, toolResult } from './tools.js';

/**
 * The local MCP server.
 *
 * It exists so Claude Code can use the toolkit's real validation and
 * compilation logic instead of guessing at YAML and editing files blind. Its
 * security posture is deliberately conservative:
 *
 *   - all file access is confined to one workspace root
 *   - a configured game installation is added to a forbidden list, so no tool
 *     can read or write it even by accident
 *   - no tool writes files; scaffolding tools return content for Claude Code to
 *     write through its normal, user-visible edit flow
 *   - nothing returns environment variables or the Anthropic API key
 */

export interface ServerOptions {
  /** Directory all file access is confined to. Defaults to the process cwd. */
  workspace?: string;
  toolkitVersion: string;
}

export function createSandboxForWorkspace(workspace: string): Sandbox {
  // Any configured game or launcher path is off limits, always.
  const { config } = loadConfig();
  const forbidden = [config.gamePath, config.modLauncherPath, config.connectedMapPath].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  return createSandbox(workspace, forbidden);
}

export function createMcpServer(options: ServerOptions): McpServer {
  const workspace = path.resolve(options.workspace ?? process.cwd());
  const sandbox = createSandboxForWorkspace(workspace);

  const server = new McpServer(
    {
      name: 'springfield-after-hours-toolkit',
      version: options.toolkitVersion,
    },
    {
      instructions: [
        'This server exposes the Springfield After Hours Toolkit, which builds mods',
        "for The Simpsons: Hit & Run using Lucas' Simpsons: Hit & Run Mod Launcher.",
        '',
        'CRITICAL: never invent game content. Springfield locations, locator names,',
        'vehicle names, character codes and script commands must all come from',
        'search_registry. If a search returns nothing, the correct response is to tell',
        'the user the content is not verified — not to guess a plausible name. A',
        'campaign referencing unverified content will not build, by design.',
        '',
        'Before claiming a feature is possible, call get_capability_status. This game',
        'has no day/night cycle, no weather system and no dynamic NPC scheduling.',
        '',
        'Scaffolding tools return file content rather than writing it, so use your',
        'normal file-editing flow to apply their output.',
      ].join('\n'),
    },
  );

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      // The SDK passes validated arguments; every handler is synchronous.
      (args: Record<string, unknown>) => {
        try {
          const context = createToolContext(sandbox, options.toolkitVersion);
          return toolResult(tool.handler(args, context));
        } catch (error) {
          if (error instanceof SandboxViolation) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: `Refused: ${error.message}`,
                },
              ],
            };
          }
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Tool "${tool.name}" failed: ${(error as Error).message}`,
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

export async function startStdioServer(options: ServerOptions): Promise<void> {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
