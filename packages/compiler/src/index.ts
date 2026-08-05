import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Campaign } from '@sah/schemas';
import type { Registry } from '@sah/registry';
import { validateCampaign, type Diagnostic } from '@sah/validator';

export type GeneratedFile = { path: string; content: string; sha256: string };
const hash = (content: string): string => createHash('sha256').update(content).digest('hex');
const quoteLua = (value: string): string => JSON.stringify(value);

export function previewBuild(
  campaign: Campaign,
  registry: Registry,
): { files: GeneratedFile[]; diagnostics: Diagnostic[] } {
  const result = validateCampaign(campaign, registry);
  if (!result.valid) return { files: [], diagnostics: result.diagnostics };
  const missionLua = campaign.missions
    .map((mission) =>
      [
        `-- Compiler fixture; not certified playable`,
        `Game.SelectMission(${quoteLua(mission.id)})`,
        ...mission.stages.flatMap((stage) => [
          `Game.AddStage()`,
          `Game.AddObjective("dummy") -- ${stage.id}: noop`,
          `Game.CloseObjective()`,
          `Game.CloseStage()`,
        ]),
        `Game.CloseMission()`,
        '',
      ].join('\n'),
    )
    .join('\n');
  const raw: Array<[string, string]> = [
    [
      'Meta.ini',
      `[Miscellaneous]\nTitle=${campaign.campaign.title}\nVersion=${campaign.campaign.version}\n`,
    ],
    ['CustomFiles.ini', `[Miscellaneous]\nRequiredHack=CustomFiles\n`],
    ['CustomFiles.lua', `-- Generated deterministically by SAH Toolkit\n`],
    ['Resources/scripts/missions.lua', `${missionLua}\n`],
  ];
  const manifestBasis = raw.map(([path, content]) => ({ path, sha256: hash(content) }));
  const manifest = `${JSON.stringify({ schemaVersion: 1, campaign: campaign.campaign.id, version: campaign.campaign.version, generatedBy: 'sah-toolkit', files: manifestBasis, warnings: ['Generated mission Lua is a non-playable compiler fixture until Game.lua integration is pinned and verified.'] }, null, 2)}\n`;
  raw.push(['sah-build-manifest.json', manifest]);
  return {
    files: raw
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, content]) => ({ path, content, sha256: hash(content) })),
    diagnostics: result.diagnostics,
  };
}

export async function writeBuild(
  campaign: Campaign,
  registry: Registry,
  output: string,
): Promise<GeneratedFile[]> {
  const result = previewBuild(campaign, registry);
  if (result.diagnostics.some((item) => item.severity === 'error'))
    throw new Error(result.diagnostics.map((item) => `${item.code}: ${item.message}`).join('\n'));
  const root = resolve(output);
  await rm(root, { recursive: true, force: true });
  for (const file of result.files) {
    const target = resolve(root, file.path);
    if (!target.startsWith(`${root}${sep}`)) throw new Error(`Unsafe output path: ${file.path}`);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, file.content, 'utf8');
  }
  return result.files;
}
