import fs from 'node:fs';
import path from 'node:path';
import { isInside, resolveWithin } from '@sah/core';

/**
 * The MCP sandbox.
 *
 * Every tool that touches the filesystem goes through here. The caller of an
 * MCP tool is a language model, so "the path is probably fine" is not an
 * acceptable standard: paths are resolved against a fixed workspace root and
 * anything that escapes is refused.
 *
 * The server additionally refuses to touch a configured game installation under
 * any circumstances, because no legitimate tool here needs to.
 */

export class SandboxViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxViolation';
  }
}

export interface Sandbox {
  /** Absolute path all tool file access is confined to. */
  root: string;
  /** Paths that must never be read or written, even inside the root. */
  forbidden: string[];
}

export function createSandbox(root: string, forbidden: string[] = []): Sandbox {
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved)) {
    throw new SandboxViolation(`Workspace root does not exist: ${resolved}`);
  }
  return {
    root: resolved,
    forbidden: forbidden.filter(Boolean).map((p) => path.resolve(p)),
  };
}

/**
 * Resolves a caller-supplied relative path inside the sandbox.
 *
 * Throws rather than returning a fallback: a tool that silently substitutes a
 * different path when given a malicious one is worse than one that errors.
 */
export function resolveInSandbox(sandbox: Sandbox, relativePath: string): string {
  const safety = resolveWithin(sandbox.root, relativePath);
  if (!safety.safe) {
    throw new SandboxViolation(
      `Refused path "${relativePath}": ${safety.reason}. All paths must be relative to the workspace root.`,
    );
  }

  for (const forbiddenPath of sandbox.forbidden) {
    if (isInside(forbiddenPath, safety.resolved)) {
      throw new SandboxViolation(
        `Refused path "${relativePath}": it resolves inside a protected directory. This server never reads or writes game installation files.`,
      );
    }
  }

  return safety.resolved;
}

/** Converts an absolute path back to a workspace-relative one for output. */
export function toWorkspaceRelative(sandbox: Sandbox, absolutePath: string): string {
  return path.relative(sandbox.root, absolutePath).split(path.sep).join('/');
}
