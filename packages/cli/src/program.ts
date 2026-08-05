import { Command } from 'commander';
import { EXIT_CODES, SahError, type ExitCode } from '@sah/core';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runValidate } from './commands/validate.js';
import { runBuild } from './commands/build.js';
import { runRegistryList, runRegistrySearch, runRegistryValidate } from './commands/registry.js';
import { runScaffold } from './commands/scaffold.js';
import { runConfig, runExplain, runPackage } from './commands/misc.js';
import { runAiCommand } from './commands/ai.js';
import { runMcpStart } from './commands/mcp.js';
import { toolkitVersion } from './context.js';
import { printError } from './output.js';

/**
 * Builds the `sah` command tree.
 *
 * Every action returns an exit code rather than calling process.exit, so the
 * whole CLI is testable in-process.
 */
export function createProgram(): Command {
  const program = new Command();
  let exitCode: ExitCode = EXIT_CODES.OK;
  const setExit = (code: ExitCode): void => {
    // The worst outcome across a run wins.
    if (code !== EXIT_CODES.OK) exitCode = code;
  };

  program
    .name('sah')
    .description(
      [
        'Springfield After Hours Toolkit — author story-driven campaigns for',
        "The Simpsons: Hit & Run under Lucas' Simpsons: Hit & Run Mod Launcher.",
        '',
        'This is an unofficial fan-made tool. It is not affiliated with Electronic',
        'Arts, Disney, Fox, Radical Entertainment or Donut Team, and it does not',
        'contain or distribute the game or any of its assets.',
      ].join('\n'),
    )
    .version(toolkitVersion(), '-v, --version')
    .showHelpAfterError('(run "sah --help" for usage)')
    .enablePositionalOptions();

  program
    .command('doctor')
    .description('Report the environment: tools, paths, registries, and platform limits')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runDoctor({ json: options.json }));
    });

  program
    .command('init')
    .description('Create a new campaign workspace')
    .argument('[directory]', 'directory to create the workspace in', '.')
    .option('--id <id>', 'campaign id (lower-kebab-case)', 'my-campaign')
    .option('--title <title>', 'campaign title', 'My Campaign')
    .option('--force', 'overwrite existing files', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        directory: string,
        options: { id: string; title: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runInit({
            directory,
            id: options.id,
            title: options.title,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  program
    .command('validate')
    .description('Validate a campaign against the schemas and the verified registries')
    .argument('[target]', 'campaign directory or campaign file', '.')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { json: boolean }) => {
      setExit(runValidate({ target, json: options.json }));
    });

  program
    .command('build')
    .description('Validate, then generate the mod into the build directory')
    .argument('[target]', 'campaign directory or campaign file', '.')
    .option('-o, --output <directory>', 'output directory (defaults to <campaign>/build)')
    .option('--dry-run', 'report what would be written without writing it', false)
    .option(
      '--include-timestamp',
      'record a build time in the manifest (breaks byte-identical rebuilds)',
      false,
    )
    .option('--json', 'machine-readable output', false)
    .action(
      (
        target: string,
        options: {
          output?: string;
          dryRun: boolean;
          json: boolean;
          includeTimestamp: boolean;
        },
      ) => {
        setExit(
          runBuild({
            target,
            ...(options.output ? { outputDirectory: options.output } : {}),
            dryRun: options.dryRun,
            json: options.json,
            includeTimestamp: options.includeTimestamp,
          }),
        );
      },
    );

  program
    .command('package')
    .description('Package a built mod into a distributable archive')
    .argument('[target]', 'campaign directory', '.')
    .option('-o, --output <file>', 'output archive path')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { output?: string; json: boolean }) => {
      setExit(
        runPackage({
          target,
          ...(options.output ? { outputFile: options.output } : {}),
          json: options.json,
        }),
      );
    });

  program
    .command('config')
    .description('Show the effective configuration and where each value came from')
    .argument('[target]', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((target: string, options: { json: boolean }) => {
      setExit(runConfig({ target, json: options.json }));
    });

  program
    .command('explain')
    .description('Explain a diagnostic code')
    .argument('<code>', 'diagnostic code, e.g. SAH2001')
    .option('--json', 'machine-readable output', false)
    .action((code: string, options: { json: boolean }) => {
      setExit(runExplain({ code, json: options.json }));
    });

  // --- campaign / mission / dialogue scaffolding ------------------------------
  const campaign = program.command('campaign').description('Campaign-level commands');
  campaign
    .command('new')
    .description('Create a new campaign workspace (alias of "sah init")')
    .argument('[directory]', 'directory to create the workspace in', '.')
    .option('--id <id>', 'campaign id (lower-kebab-case)', 'my-campaign')
    .option('--title <title>', 'campaign title', 'My Campaign')
    .option('--force', 'overwrite existing files', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        directory: string,
        options: { id: string; title: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runInit({
            directory,
            id: options.id,
            title: options.title,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  const mission = program.command('mission').description('Mission-level commands');
  mission
    .command('new')
    .description('Scaffold a new mission file')
    .argument('<id>', 'mission id (lower-kebab-case)')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--title <title>', 'mission title')
    .option('--force', 'overwrite an existing file', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        id: string,
        options: { campaign: string; title?: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runScaffold({
            kind: 'mission',
            id,
            ...(options.title ? { title: options.title } : {}),
            campaignRoot: options.campaign,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  const dialogue = program.command('dialogue').description('Dialogue-level commands');
  dialogue
    .command('new')
    .description('Scaffold a new conversation file')
    .argument('<id>', 'conversation id (lower-kebab-case)')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--title <title>', 'conversation title')
    .option('--force', 'overwrite an existing file', false)
    .option('--json', 'machine-readable output', false)
    .action(
      (
        id: string,
        options: { campaign: string; title?: string; force: boolean; json: boolean },
      ) => {
        setExit(
          runScaffold({
            kind: 'dialogue',
            id,
            ...(options.title ? { title: options.title } : {}),
            campaignRoot: options.campaign,
            force: options.force,
            json: options.json,
          }),
        );
      },
    );

  // --- registry ---------------------------------------------------------------
  const registry = program
    .command('registry')
    .description('Inspect the verified game-content registries');

  registry
    .command('validate')
    .description('Check every registry record for schema validity and provenance')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runRegistryValidate({ json: options.json }));
    });

  registry
    .command('search')
    .description('Search the registries')
    .argument('[kind]', 'registry to search, e.g. location, character, command')
    .argument('[query...]', 'search terms')
    .option('--status <statuses>', 'comma-separated verification statuses to include')
    .option('--limit <n>', 'maximum results', '20')
    .option('--json', 'machine-readable output', false)
    .action(
      (
        kind: string | undefined,
        query: string[] | undefined,
        options: { status?: string; limit: string; json: boolean },
      ) => {
        const terms = query ?? [];
        // "sah registry search bart" — no kind given, treat the first word as the query.
        const kindKnown = kind !== undefined && terms.length > 0;
        const searchQuery = kindKnown
          ? terms.join(' ')
          : [kind, ...terms].filter(Boolean).join(' ');

        if (searchQuery.trim().length === 0) {
          printError('A search query is required. Example: sah registry search character bart');
          setExit(EXIT_CODES.USAGE);
          return;
        }

        setExit(
          runRegistrySearch({
            ...(kindKnown && kind ? { kind } : {}),
            query: searchQuery,
            ...(options.status ? { status: options.status } : {}),
            limit: Number.parseInt(options.limit, 10) || 20,
            json: options.json,
          }),
        );
      },
    );

  registry
    .command('list')
    .description('List every record in one registry')
    .argument('<kind>', 'registry to list')
    .option('--json', 'machine-readable output', false)
    .action((kind: string, options: { json: boolean }) => {
      setExit(runRegistryList({ kind, json: options.json }));
    });

  // --- ai ---------------------------------------------------------------------
  const ai = program
    .command('ai')
    .description(
      'Optional Anthropic API assistance (requires ANTHROPIC_API_KEY; may incur charges)',
    );

  ai.command('doctor')
    .description('Report whether the optional AI integration is usable')
    .option('--json', 'machine-readable output', false)
    .action((options: { json: boolean }) => {
      setExit(runAiCommand({ subcommand: 'doctor', json: options.json }));
    });

  ai.command('plan')
    .description('Ask Claude to propose campaign structure (never writes files directly)')
    .argument('<prompt...>', 'what you want planned')
    .option('-C, --campaign <directory>', 'campaign directory for context', '.')
    .option('--json', 'machine-readable output', false)
    .action((prompt: string[], options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'plan',
          prompt: prompt.join(' '),
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('scaffold-mission')
    .description('Ask Claude to propose a mission, then validate it before anything is written')
    .argument('<prompt...>', 'what the mission should do')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((prompt: string[], options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'scaffold-mission',
          prompt: prompt.join(' '),
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('explain-error')
    .description('Ask Claude to explain a validation diagnostic in context')
    .argument('<code>', 'diagnostic code')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((code: string, options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'explain-error',
          prompt: code,
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  ai.command('audit')
    .description('Ask Claude to review a campaign for structural and narrative problems')
    .option('-C, --campaign <directory>', 'campaign directory', '.')
    .option('--json', 'machine-readable output', false)
    .action((options: { campaign: string; json: boolean }) => {
      setExit(
        runAiCommand({
          subcommand: 'audit',
          campaignRoot: options.campaign,
          json: options.json,
        }),
      );
    });

  // --- mcp --------------------------------------------------------------------
  const mcp = program.command('mcp').description('Local MCP server for Claude Code');
  mcp
    .command('start')
    .description('Start the MCP server on stdio')
    .option(
      '--workspace <directory>',
      'restrict all file access to this directory (defaults to the current directory)',
    )
    .action(async (options: { workspace?: string }) => {
      setExit(await runMcpStart(options.workspace ? { workspace: options.workspace } : {}));
    });

  // Expose the accumulated exit code to the caller.
  Object.defineProperty(program, 'sahExitCode', {
    get: () => exitCode,
    configurable: true,
  });

  // Commander calls process.exit directly for --help, --version and usage
  // errors. Overriding that on every command makes the whole CLI runnable
  // in-process, which is what lets the exit codes be tested rather than assumed.
  applyExitOverride(program);

  return program;
}

function applyExitOverride(command: Command): void {
  command.exitOverride();
  for (const child of command.commands) applyExitOverride(child);
}

export async function runCli(argv: readonly string[]): Promise<ExitCode> {
  const program = createProgram();
  try {
    await program.parseAsync([...argv], { from: 'user' });
  } catch (error) {
    if (error instanceof SahError) {
      printError(error.message);
      if (error.hint) printError(`hint: ${error.hint}`);
      return error.exitCode;
    }
    // With exitOverride in place, Commander throws instead of exiting. Help and
    // version are successful outcomes; everything else commander- prefixed is a
    // usage error.
    const commanderError = error as { code?: string; exitCode?: number };
    if (
      commanderError.code === 'commander.helpDisplayed' ||
      commanderError.code === 'commander.help' ||
      commanderError.code === 'commander.version'
    ) {
      return EXIT_CODES.OK;
    }
    if (commanderError.code?.startsWith('commander.')) {
      return EXIT_CODES.USAGE;
    }
    printError(`Unexpected error: ${(error as Error).message}`);
    return EXIT_CODES.INTERNAL;
  }

  return (program as Command & { sahExitCode: ExitCode }).sahExitCode;
}
