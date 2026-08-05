import process from 'node:process';
import { EXIT_CODES, type ExitCode } from '@sah/core';
import { startStdioServer } from '@sah/mcp-server';
import { toolkitVersion } from '../context.js';

/**
 * `sah mcp start` — runs the MCP server on stdio.
 *
 * Nothing may be written to stdout here: the MCP protocol owns that stream.
 * Status messages go to stderr, where Claude Code shows them as server logs.
 */
export async function runMcpStart(options: { workspace?: string } = {}): Promise<ExitCode> {
  const workspace = options.workspace ?? process.cwd();

  try {
    process.stderr.write(
      `Springfield After Hours Toolkit MCP server starting (workspace: ${workspace})\n`,
    );
    await startStdioServer({ workspace, toolkitVersion: toolkitVersion() });
    return EXIT_CODES.OK;
  } catch (error) {
    process.stderr.write(`Failed to start the MCP server: ${(error as Error).message}\n`);
    return EXIT_CODES.INTERNAL;
  }
}
