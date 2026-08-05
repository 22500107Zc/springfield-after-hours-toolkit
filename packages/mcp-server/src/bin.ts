#!/usr/bin/env node
import process from 'node:process';
import { startStdioServer } from './server.js';

/**
 * stdio entrypoint.
 *
 * MCP speaks JSON-RPC over stdout, so nothing here may write to stdout.
 * Diagnostics go to stderr only.
 */
const workspaceArgIndex = process.argv.indexOf('--workspace');
const workspace =
  workspaceArgIndex >= 0 ? process.argv[workspaceArgIndex + 1] : process.env['SAH_WORKSPACE'];

try {
  await startStdioServer({
    ...(workspace ? { workspace } : {}),
    toolkitVersion: process.env['SAH_VERSION'] ?? '0.1.0',
  });
} catch (error) {
  process.stderr.write(`Failed to start the MCP server: ${(error as Error).message}\n`);
  process.exit(1);
}
