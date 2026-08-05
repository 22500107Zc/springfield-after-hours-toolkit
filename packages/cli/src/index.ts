#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { Registry } from '@sah/registry';
import { validateCampaignFile } from '@sah/validator';
import { previewBuild, writeBuild } from '@sah/compiler';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const registryPath = join(repoRoot, 'data/registries/core.yaml');
const loadRegistry = (): Promise<Registry> => Registry.fromFile(registryPath);
const output = (value: unknown, json: boolean): void =>
  console.log(json ? JSON.stringify(value, null, 2) : value);
const unsupported = (feature: string): never => {
  throw new Error(`${feature} is planned but not implemented; no files were changed.`);
};
const program = new Command()
  .name('sah')
  .description('Safe, provenance-first Simpsons: Hit & Run campaign toolkit')
  .version('0.1.0');

program
  .command('doctor')
  .option('--json')
  .action(async ({ json }) => {
    let npm = 'unavailable';
    try {
      npm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
    } catch {
      /* reported */
    }
    const registry = await loadRegistry();
    output(
      {
        platform: process.platform,
        node: process.version,
        npm,
        gamePathConfigured: Boolean(process.env.SAH_GAME_PATH),
        launcherPathConfigured: Boolean(process.env.SAH_MOD_LAUNCHER_PATH),
        modsPathConfigured: Boolean(process.env.SAH_MODS_PATH),
        anthropicKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY),
        registryEntries: registry.entries.length,
        gameLaunchSupported: process.platform === 'win32',
        note:
          process.platform === 'win32'
            ? 'Launch integration is not implemented.'
            : 'Native game launching is not supported on this platform.',
      },
      Boolean(json),
    );
  });

program
  .command('init')
  .argument('[directory]', '.')
  .option('--force')
  .action(async (directory, { force }) => {
    const root = resolve(directory);
    const marker = join(root, 'campaign.yaml');
    try {
      await access(marker);
      if (!force)
        throw new Error(`${marker} exists; use --force to overwrite generated templates.`);
    } catch (error) {
      if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
    }
    const files: Record<string, string> = {
      'campaign.yaml':
        'campaign:\n  id: my-campaign\n  title: My Campaign\n  version: 0.1.0\nmissions:\n  - id: fixture-mission\n    player: fixture-player\n    stages:\n      - id: stage-1\n        objective:\n          type: noop\n          note: Replace after verifying a supported objective.\ndialogue: []\n',
      'Meta.ini': '; Source template; sah build generates the final file.\n',
      'CustomFiles.ini': '; Source template\n',
      'CustomFiles.lua': '-- Source template\n',
      '.sahrc.example': 'gamePath: ""\nlauncherPath: ""\nmodsPath: ""\n',
      'README.md':
        '# Campaign workspace\n\nEdit campaign.yaml, validate it, then build. Never place copyrighted game assets under source control.\n',
    };
    for (const folder of ['Resources', 'missions', 'dialogue', 'presets'])
      await mkdir(join(root, folder), { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), content);
    }
    console.log(`Created campaign workspace at ${root}`);
  });

program
  .command('validate')
  .argument('[file]', 'campaign.yaml')
  .option('--json')
  .action(async (file, { json }) => {
    const result = await validateCampaignFile(resolve(file), await loadRegistry());
    output(
      json
        ? result
        : result.diagnostics.length
          ? result.diagnostics
              .map((d) => `${d.severity.toUpperCase()} ${d.code}: ${d.message}`)
              .join('\n')
          : 'Campaign is valid.',
      Boolean(json),
    );
    if (!result.valid) process.exitCode = 2;
  });
program
  .command('build')
  .argument('[file]', 'campaign.yaml')
  .option('-o, --output <directory>', 'output directory', 'build')
  .option('--dry-run')
  .option('--json')
  .action(async (file, options) => {
    const registry = await loadRegistry();
    const result = await validateCampaignFile(resolve(file), registry);
    if (!result.valid || !result.campaign) {
      output(result, Boolean(options.json));
      process.exitCode = 2;
      return;
    }
    const preview = previewBuild(result.campaign, registry);
    if (!options.dryRun) await writeBuild(result.campaign, registry, resolve(options.output));
    output(
      options.json
        ? preview
        : `${options.dryRun ? 'Would generate' : 'Generated'} ${preview.files.length} deterministic files.`,
      Boolean(options.json),
    );
  });
const registry = program.command('registry');
registry
  .command('validate')
  .action(async () =>
    console.log(`Registry valid: ${(await loadRegistry()).entries.length} entries.`),
  );
registry
  .command('search')
  .argument('<kind>')
  .argument('<query>')
  .option('--json')
  .action(async (kind, query, { json }) =>
    output((await loadRegistry()).search(kind, query), Boolean(json)),
  );
program
  .command('campaign')
  .command('new')
  .action(() => unsupported('campaign new (use sah init for the MVP)'));
program
  .command('mission')
  .command('new')
  .action(() => unsupported('mission new'));
program
  .command('dialogue')
  .command('new')
  .action(() => unsupported('dialogue new'));
program.command('package').action(() => unsupported('package'));
program.command('config').action(() => unsupported('config'));
const ai = program.command('ai');
for (const name of ['doctor', 'plan', 'scaffold-mission', 'explain-error', 'audit'])
  ai.command(name).action(() => unsupported(`ai ${name}`));
program
  .command('mcp')
  .command('start')
  .action(async () => {
    await import('../../mcp-server/src/index.js');
  });
await program.parseAsync();
