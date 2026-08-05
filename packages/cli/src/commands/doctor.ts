import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { EXIT_CODES, describePlatform, hasAnthropicApiKey, type ExitCode } from '@sah/core';
import { checkGameLuaAvailability } from '@sah/adapter-game-lua';
import { registryCounts } from '@sah/registry';
import { createContext } from '../context.js';
import { printJson, printLine, renderTable } from '../output.js';

/**
 * `sah doctor` — reports the environment honestly.
 *
 * Its job is to tell the truth about what will and will not work here,
 * including saying plainly when the game cannot be launched on this platform.
 * It never prints the value of ANTHROPIC_API_KEY, only whether one is set.
 */

type CheckStatus = 'ok' | 'warn' | 'missing' | 'unsupported' | 'info';

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

function commandVersion(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split('\n')[0];
  } catch {
    return undefined;
  }
}

function pathCheck(name: string, configured: string | undefined, purpose: string): Check {
  if (!configured) {
    return {
      name,
      status: 'info',
      detail: `not configured — ${purpose}`,
    };
  }
  if (fs.existsSync(configured)) {
    return { name, status: 'ok', detail: configured };
  }
  return { name, status: 'warn', detail: `configured but does not exist: ${configured}` };
}

export interface DoctorResult {
  ok: boolean;
  checks: Check[];
  exitCode: ExitCode;
}

export function runDoctor(options: { json: boolean }): ExitCode {
  const context = createContext();
  const platform = describePlatform();
  const checks: Check[] = [];

  // --- Environment -----------------------------------------------------------
  checks.push({
    name: 'operating system',
    status: 'info',
    detail: `${platform.platform} (${platform.osRelease}, ${platform.arch})`,
  });
  checks.push({
    name: 'node',
    status: majorVersion(platform.nodeVersion) >= 20 ? 'ok' : 'warn',
    detail:
      majorVersion(platform.nodeVersion) >= 20
        ? platform.nodeVersion
        : `${platform.nodeVersion} — this toolkit requires Node 20 or newer`,
  });

  const npmVersion = commandVersion('npm', ['--version']);
  checks.push({
    name: 'npm',
    status: npmVersion ? 'ok' : 'warn',
    detail: npmVersion ?? 'not found on PATH',
  });

  // --- Repository ------------------------------------------------------------
  const gitStatus = commandVersion('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  checks.push({
    name: 'repository',
    status: gitStatus ? 'ok' : 'info',
    detail: gitStatus ? `git branch ${gitStatus}` : 'not a git repository (this is fine)',
  });

  // --- Configured paths ------------------------------------------------------
  checks.push(
    pathCheck(
      'game path',
      context.config.gamePath,
      'only needed to launch the game; never written to',
    ),
  );
  checks.push(
    pathCheck(
      'mod launcher path',
      context.config.modLauncherPath,
      'only needed to launch the game',
    ),
  );
  checks.push(
    pathCheck('mods directory', context.config.modsDirectory, 'only needed to install a built mod'),
  );
  checks.push(
    pathCheck(
      'connected map path',
      context.config.connectedMapPath,
      'a user-supplied connected-map mod; never bundled by this toolkit',
    ),
  );

  // --- Optional tools --------------------------------------------------------
  const lua =
    commandVersion('lua', ['-v']) ??
    commandVersion('lua5.3', ['-v']) ??
    commandVersion('luajit', ['-v']);
  checks.push({
    name: 'lua interpreter',
    status: lua ? 'ok' : 'info',
    detail: lua ? lua : 'not found — optional. The toolkit generates Lua but does not execute it.',
  });

  const gameLua = checkGameLuaAvailability();
  checks.push({
    name: 'upstream Game.lua',
    status: gameLua.available ? 'ok' : 'missing',
    detail: gameLua.message,
  });

  // --- Secrets ---------------------------------------------------------------
  // Report presence only. The value is never read, printed or logged.
  checks.push({
    name: 'ANTHROPIC_API_KEY',
    status: hasAnthropicApiKey() ? 'ok' : 'info',
    detail: hasAnthropicApiKey()
      ? 'set (value not shown, and never logged)'
      : 'not set — optional. Only the "sah ai" commands need it.',
  });

  // --- Registries ------------------------------------------------------------
  const counts = registryCounts(context.registries);
  const registryErrors = context.registries.diagnostics.filter((d) => d.severity === 'error');
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  checks.push({
    name: 'registries',
    status: registryErrors.length === 0 ? 'ok' : 'warn',
    detail:
      registryErrors.length === 0
        ? `${total} records loaded and valid across ${Object.keys(counts).length} registries`
        : `${registryErrors.length} registry error(s): ${registryErrors[0]?.message ?? ''}`,
  });

  const emptyRegistries = Object.entries(counts)
    .filter(([, n]) => n === 0)
    .map(([kind]) => kind);
  if (emptyRegistries.length > 0) {
    checks.push({
      name: 'empty registries',
      status: 'info',
      detail: `${emptyRegistries.join(', ')} — nothing verified yet, so references to them fail by design`,
    });
  }

  // --- MCP server ------------------------------------------------------------
  // Checked by resolving the module rather than spawning a process, so doctor
  // stays fast and side-effect free.
  let mcpDetail: string;
  let mcpStatus: CheckStatus;
  try {
    import.meta.resolve('@sah/mcp-server');
    mcpDetail = 'resolvable — start it with "sah mcp start" or "npm run mcp"';
    mcpStatus = 'ok';
  } catch (error) {
    mcpDetail = `not resolvable: ${(error as Error).message}`;
    mcpStatus = 'warn';
  }
  checks.push({ name: 'mcp server', status: mcpStatus, detail: mcpDetail });

  // --- Platform limitations --------------------------------------------------
  checks.push({
    name: 'launching the game',
    status: platform.canLaunchGameNatively ? 'ok' : 'unsupported',
    detail: platform.launchNotes.join(' '),
  });

  const ok = !checks.some((c) => c.status === 'warn' || c.status === 'missing');

  if (options.json) {
    printJson({ ok, command: 'doctor', platform, checks, registries: counts });
    return ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
  }

  printLine('sah doctor');
  printLine();
  const symbols: Record<CheckStatus, string> = {
    ok: '  ok    ',
    warn: '  warn  ',
    missing: '  miss  ',
    unsupported: '  n/a   ',
    info: '  info  ',
  };
  renderTable(
    checks.map((check) => [`${symbols[check.status]}${check.name}`, check.detail]),
    '',
  );
  printLine();
  printLine(
    ok
      ? 'No blocking problems found.'
      : 'Some checks need attention. Nothing above prevents authoring or validating a campaign.',
  );

  return ok ? EXIT_CODES.OK : EXIT_CODES.VALIDATION_FAILED;
}

function majorVersion(version: string): number {
  return Number.parseInt(version.replace(/^v/, '').split('.')[0] ?? '0', 10);
}
