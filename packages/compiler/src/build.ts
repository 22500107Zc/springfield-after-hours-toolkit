import fs from 'node:fs';
import path from 'node:path';
import {
  DIAGNOSTIC_CODES,
  DiagnosticBag,
  findCaseCollisions,
  isInside,
  listFilesRecursive,
  normaliseText,
  resolveWithin,
  sha256,
  stableStringify,
  type Diagnostic,
} from '@sah/core';
import { checkGameLuaAvailability, emitMission, gameLuaDependency } from '@sah/adapter-game-lua';
import {
  generateCustomFilesIni,
  generateCustomFilesLua,
  generateMetaIni,
  type PathHandlerEntry,
} from '@sah/adapter-lucas-launcher';
import { referenceId } from '@sah/schemas';
import type { RegistryKind } from '@sah/schemas';
import { resolveRecord, type RegistrySet } from '@sah/registry';
import { validateProject, type LoadedCampaignProject, type ValidationResult } from '@sah/validator';
import { buildManifest, type BuildManifest } from './manifest.js';

/** Mod-relative directory holding upstream Lua libraries. */
const LIBRARY_DIRECTORY = 'Resources/lib';
/** Mod-relative directory holding generated mission scripts. */
const SCRIPT_DIRECTORY = 'Resources/scripts/missions';

export interface BuildOptions {
  /** Absolute path of the output directory. */
  outputDirectory: string;
  /** Report what would be written without touching the filesystem. */
  dryRun?: boolean;
  /** Toolkit version recorded in the manifest. */
  toolkitVersion: string;
  /**
   * Include a wall-clock timestamp in the manifest.
   *
   * Off by default: deterministic output is a requirement, and a timestamp
   * would make two builds of identical input differ.
   */
  includeTimestamp?: boolean;
}

export interface GeneratedFile {
  /** Path relative to the output directory, forward slashes. */
  path: string;
  contents: string;
  /** Where this file's content came from, for the manifest. */
  generatedFrom: string;
}

export interface BuildResult {
  ok: boolean;
  validation: ValidationResult;
  diagnostics: Diagnostic[];
  files: GeneratedFile[];
  /** Assets copied verbatim from the campaign, relative to the output. */
  copiedAssets: Array<{ from: string; to: string; sha256: string }>;
  manifest: BuildManifest | undefined;
  outputDirectory: string;
  dryRun: boolean;
}

export function buildCampaign(
  project: LoadedCampaignProject,
  registries: RegistrySet,
  options: BuildOptions,
): BuildResult {
  const bag = new DiagnosticBag();
  const validation = validateProject(project, registries);

  // Rule 2 of the build contract: never build on validation errors.
  if (!validation.ok) {
    return {
      ok: false,
      validation,
      diagnostics: validation.diagnostics,
      files: [],
      copiedAssets: [],
      manifest: undefined,
      outputDirectory: options.outputDirectory,
      dryRun: options.dryRun ?? false,
    };
  }

  const { campaign } = project;
  const files: GeneratedFile[] = [];
  const usedRecords: Array<{ kind: RegistryKind; id: string }> = [];
  const pathHandlers: PathHandlerEntry[] = [];

  // --- Mission scripts --------------------------------------------------------
  for (const { mission, file } of project.missions) {
    const emitted = emitMission(mission, registries, file);
    bag.extend(emitted.diagnostics);
    usedRecords.push(...emitted.usedRecords);

    if (emitted.diagnostics.some((d) => d.severity === 'error')) continue;

    const levelRecord = resolveRecord(registries, 'levels', referenceId(mission.level)).record;
    const levelCode = levelRecord?.gameCode ?? referenceId(mission.level);
    const scriptRelative = `${SCRIPT_DIRECTORY}/${levelCode}/${mission.gameMissionName}i.lua`;

    files.push({
      path: scriptRelative,
      contents: emitted.lua,
      generatedFrom: file,
    });

    // The game requests the .mfk; the handler runs our Lua instead.
    const scriptPath = levelRecord?.['scriptPath'];
    const gameScriptDir =
      typeof scriptPath === 'string' ? scriptPath : `scripts\\missions\\${levelCode}`;
    pathHandlers.push({
      gamePath: `${gameScriptDir}\\${mission.gameMissionName}i.mfk`,
      scriptPath: scriptRelative,
    });
  }

  // --- Required hacks ---------------------------------------------------------
  const hackNames = collectRequiredHacks(project, registries);

  // --- Launcher configuration -------------------------------------------------
  files.push({
    path: 'Meta.ini',
    contents: generateMetaIni({
      campaign,
      requiredHacks: hackNames,
      generatorVersion: options.toolkitVersion,
    }),
    generatedFrom: 'campaign.yaml',
  });

  files.push({
    path: 'CustomFiles.ini',
    contents: generateCustomFilesIni({ pathHandlers }),
    generatedFrom: 'campaign.yaml + mission files',
  });

  const gameLua = checkGameLuaAvailability();
  if (!gameLua.available) {
    bag.warn(DIAGNOSTIC_CODES.UPSTREAM_MISSING, gameLua.message, {
      hint: 'The build still produces correct scripts, but the mod will not run until Game.lua is installed.',
    });
  }

  files.push({
    path: 'CustomFiles.lua',
    contents: generateCustomFilesLua({
      includeGameUtils: false,
      libraryDirectory: LIBRARY_DIRECTORY,
      campaignTitle: campaign.title,
      gameLuaMissing: !gameLua.available,
    }),
    generatedFrom: 'campaign.yaml',
  });

  files.push({
    path: 'README.generated.md',
    contents: generateOutputReadme(project, gameLua.available, options.toolkitVersion),
    generatedFrom: 'campaign.yaml',
  });

  // --- Dialogue -------------------------------------------------------------
  // The game's dialogue binary formats have NOT been verified by this toolkit,
  // so dialogue is exported as structured data plus an explicit report of the
  // manual step that remains. It is deliberately not written as a game file.
  if (project.conversations.length > 0) {
    files.push({
      path: 'Resources/dialogue/dialogue.json',
      contents: normaliseText(
        stableStringify({
          note: "Structured dialogue export. This is NOT a game file. The toolkit has not verified the game's dialogue formats and will not guess at them.",
          campaign: campaign.id,
          conversations: project.conversations.map((c) => c.conversation),
        }),
      ),
      generatedFrom: 'dialogue files',
    });
    files.push({
      path: 'Resources/dialogue/REMAINING-MANUAL-STEPS.md',
      contents: generateDialogueReport(project),
      generatedFrom: 'dialogue files',
    });
  }

  // --- Output safety ----------------------------------------------------------
  checkOutputPaths(bag, files);

  // --- User-supplied assets ---------------------------------------------------
  const copiedAssets = planAssetCopies(bag, project);

  if (bag.hasErrors) {
    return {
      ok: false,
      validation,
      diagnostics: [...validation.diagnostics, ...bag.sorted()],
      files,
      copiedAssets,
      manifest: undefined,
      outputDirectory: options.outputDirectory,
      dryRun: options.dryRun ?? false,
    };
  }

  const manifest = buildManifest({
    project,
    registries,
    files,
    copiedAssets,
    usedRecords,
    acceptedRisks: validation.acceptedRisks,
    gameLua: {
      available: gameLua.available,
      commit: gameLua.commit,
      repository: gameLuaDependency().repository,
      license: gameLuaDependency().license,
    },
    toolkitVersion: options.toolkitVersion,
    includeTimestamp: options.includeTimestamp ?? false,
    warnings: bag.warnings,
  });

  const allFiles: GeneratedFile[] = [
    ...files,
    {
      path: 'build-manifest.json',
      contents: normaliseText(stableStringify(manifest)),
      generatedFrom: 'build',
    },
  ];

  if (!options.dryRun) {
    writeOutput(options.outputDirectory, allFiles, copiedAssets, project.root);
  }

  return {
    ok: true,
    validation,
    diagnostics: [...validation.diagnostics, ...bag.sorted()],
    files: allFiles,
    copiedAssets,
    manifest,
    outputDirectory: options.outputDirectory,
    dryRun: options.dryRun ?? false,
  };
}

function collectRequiredHacks(project: LoadedCampaignProject, registries: RegistrySet): string[] {
  const names = new Set<string>();

  // Every campaign built by this toolkit delivers its scripts through the
  // Custom Files hack, so it is always required regardless of what the author
  // declared.
  const customFiles = resolveRecord(registries, 'hacks', 'custom-files').record;
  names.add(
    typeof customFiles?.['metaIniName'] === 'string' ? customFiles['metaIniName'] : 'CustomFiles',
  );

  const declared = [
    ...project.campaign.requiredHacks,
    ...project.missions.flatMap((m) => m.mission.requiredHacks),
  ];

  for (const reference of declared) {
    const record = resolveRecord(registries, 'hacks', referenceId(reference)).record;
    const metaName = record?.['metaIniName'];
    if (typeof metaName === 'string') names.add(metaName);
  }

  return [...names].sort();
}

function checkOutputPaths(bag: DiagnosticBag, files: readonly GeneratedFile[]): void {
  const seen = new Map<string, string>();

  for (const file of files) {
    const previous = seen.get(file.path);
    if (previous) {
      bag.error(
        DIAGNOSTIC_CODES.OUTPUT_COLLISION,
        `Two generated files would be written to "${file.path}" (from ${previous} and ${file.generatedFrom}).`,
        { hint: 'Give the missions distinct gameMissionName values.' },
      );
    }
    seen.set(file.path, file.generatedFrom);
  }

  for (const collision of findCaseCollisions(files.map((f) => f.path))) {
    bag.error(
      DIAGNOSTIC_CODES.PATH_CASING,
      `Generated paths differ only by capitalisation: ${collision.members.join(', ')}.`,
      { hint: 'Windows would treat these as one file, silently losing one of them.' },
    );
  }
}

function planAssetCopies(
  bag: DiagnosticBag,
  project: LoadedCampaignProject,
): Array<{ from: string; to: string; sha256: string }> {
  const copies: Array<{ from: string; to: string; sha256: string }> = [];

  for (const directory of project.campaign.assetDirectories) {
    const safety = resolveWithin(project.root, directory);
    if (!safety.safe) {
      bag.error(
        DIAGNOSTIC_CODES.UNSAFE_OUTPUT_PATH,
        `Refused to copy asset directory "${directory}": ${safety.reason}.`,
      );
      continue;
    }
    if (!fs.existsSync(safety.resolved)) {
      bag.warn(
        DIAGNOSTIC_CODES.ASSET_MISSING,
        `Asset directory "${directory}" does not exist; nothing was copied.`,
      );
      continue;
    }

    for (const relative of listFilesRecursive(safety.resolved)) {
      const source = path.join(safety.resolved, relative);
      copies.push({
        from: `${directory}/${relative}`,
        to: `${directory}/${relative}`,
        sha256: sha256(fs.readFileSync(source)),
      });
    }
  }

  return copies.sort((a, b) => a.to.localeCompare(b.to));
}

function writeOutput(
  outputDirectory: string,
  files: readonly GeneratedFile[],
  assets: ReadonlyArray<{ from: string; to: string }>,
  campaignRoot: string,
): void {
  fs.mkdirSync(outputDirectory, { recursive: true });

  for (const file of files) {
    const safety = resolveWithin(outputDirectory, file.path);
    if (!safety.safe) {
      throw new Error(`Refusing to write outside the build directory: ${file.path}`);
    }
    fs.mkdirSync(path.dirname(safety.resolved), { recursive: true });
    fs.writeFileSync(safety.resolved, file.contents, 'utf8');
  }

  for (const asset of assets) {
    const from = path.resolve(campaignRoot, asset.from);
    if (!isInside(campaignRoot, from)) {
      throw new Error(`Refusing to copy an asset from outside the campaign: ${asset.from}`);
    }
    const safety = resolveWithin(outputDirectory, asset.to);
    if (!safety.safe) {
      throw new Error(`Refusing to write outside the build directory: ${asset.to}`);
    }
    fs.mkdirSync(path.dirname(safety.resolved), { recursive: true });
    fs.copyFileSync(from, safety.resolved);
  }
}

function generateOutputReadme(
  project: LoadedCampaignProject,
  gameLuaAvailable: boolean,
  toolkitVersion: string,
): string {
  const { campaign } = project;
  const lines = [
    `# ${campaign.title}`,
    '',
    `Generated by the Springfield After Hours Toolkit v${toolkitVersion}.`,
    '',
    '## What this folder is',
    '',
    "A Lucas' Simpsons: Hit & Run Mod Launcher mod, generated from campaign source.",
    'Do not edit these files by hand — edit the campaign YAML and rebuild, or your',
    'changes will be overwritten.',
    '',
    '## Files',
    '',
    '| File | Purpose |',
    '| --- | --- |',
    '| `Meta.ini` | Mod metadata and required hacks. |',
    '| `CustomFiles.ini` | Path handlers mapping game script requests to generated Lua. |',
    '| `CustomFiles.lua` | Loads Game.lua when the mod starts. |',
    '| `Resources/scripts/missions/` | Generated mission scripts. |',
    '| `build-manifest.json` | Hashes and provenance for everything above. |',
    '',
    '## Before this mod will run',
    '',
  ];

  if (gameLuaAvailable) {
    lines.push(
      "Donut Team's `Game.lua` must be present at `Resources/lib/Game.lua`. The toolkit",
      'found it locally at build time; confirm it was installed into this folder.',
    );
  } else {
    lines.push(
      "**`Game.lua` is missing.** The generated scripts call into Donut Team's Game.lua,",
      'which this toolkit does not redistribute. Fetch it with `npm run upstream:fetch`',
      'and rebuild, or install it yourself at `Resources/lib/Game.lua`.',
    );
  }

  lines.push(
    '',
    '## Status',
    '',
    `Campaign status as declared by its author: **${campaign.status}**.`,
    '',
    'A successful build means the generated scripts are internally consistent and use',
    'only commands that exist in Game.lua with correct argument counts and scopes. It',
    'does **not** mean the campaign has been tested in the game.',
    '',
    '## Legal',
    '',
    'This mod contains no game assets. It is an unofficial fan-made modification and is',
    'not affiliated with Electronic Arts, Disney, Fox, Radical Entertainment or Donut Team.',
  );

  return normaliseText(lines.join('\n'));
}

function generateDialogueReport(project: LoadedCampaignProject): string {
  const lines = [
    '# Dialogue: remaining manual steps',
    '',
    'The toolkit exported your dialogue as structured JSON in `dialogue.json`.',
    '',
    'It did **not** generate a game dialogue file, because the toolkit has not verified',
    "the game's dialogue binary formats. Guessing at them would produce a file that",
    'either fails to load or silently plays nothing, which is worse than not producing',
    'one at all.',
    '',
    '## What you still have to do by hand',
    '',
    '1. Assign dialogue character codes for every speaker. Verified codes are in the',
    '   toolkit registry (`sah registry search character <name>`). Custom characters need',
    '   the `CustomDialogueCharacterCodes` hack and a `CustomDialogueCharacterCodes.ini`.',
    '2. Produce the text/dialogue resources in whatever format your target setup uses.',
    '3. Supply your own audio if you want voiced lines. Never extract or redistribute',
    "   the game's audio.",
    '',
    '## Conversations in this build',
    '',
  ];

  for (const { conversation } of project.conversations) {
    lines.push(`### ${conversation.id}${conversation.title ? ` — ${conversation.title}` : ''}`);
    lines.push('');
    lines.push(`Status: \`${conversation.status}\`. Lines: ${conversation.lines.length}.`);
    lines.push('');
    const ordered = [...conversation.lines].sort((a, b) => a.order - b.order);
    for (const line of ordered) {
      lines.push(`- **${referenceId(line.speaker)}**: ${line.text}`);
    }
    lines.push('');
  }

  return normaliseText(lines.join('\n'));
}
