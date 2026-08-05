import { ProvenanceIndex, sha256, type Diagnostic } from '@sah/core';
import type { RegistryKind } from '@sah/schemas';
import { getRecord, type RegistrySet } from '@sah/registry';
import type { AcceptedRisk, LoadedCampaignProject } from '@sah/validator';

/**
 * The build manifest.
 *
 * Its purpose is accountability: for every generated file it records a hash,
 * and for every game fact the build relied on it records which source justified
 * that fact. Someone reading a built mod can trace any claim back to a document
 * or a commit.
 */

export interface ManifestFileEntry {
  path: string;
  sha256: string;
  bytes: number;
  generatedFrom: string;
}

export interface ManifestRecordEntry {
  registry: RegistryKind;
  id: string;
  verificationStatus: string;
  sources: string[];
}

export interface BuildManifest {
  manifestVersion: 1;
  toolkit: {
    name: string;
    version: string;
  };
  campaign: {
    id: string;
    title: string;
    version: string;
    internalName: string;
    /** The author's own claim about how finished this is. */
    declaredStatus: string;
  };
  /** Present only when explicitly requested; omitted keeps builds deterministic. */
  generatedAt?: string;
  files: ManifestFileEntry[];
  assets: Array<{ path: string; sha256: string }>;
  /** Registry records the generated output depended on, with their sources. */
  provenance: {
    records: ManifestRecordEntry[];
    sources: Array<{ id: string; type: string; title: string; url?: string; commit?: string }>;
  };
  upstream: {
    gameLua: {
      repository: string;
      commit: string;
      license: string;
      /** False means the built mod is incomplete and will not run as-is. */
      installed: boolean;
    };
  };
  /**
   * References the author explicitly forced through despite weak verification.
   * Prominent by design — this is the manifest's most important section.
   */
  acceptedRisks: AcceptedRisk[];
  warnings: Array<{ code: string; message: string }>;
  /** Plain-language statement of what a successful build does and does not mean. */
  disclaimer: string[];
}

export interface BuildManifestInput {
  project: LoadedCampaignProject;
  registries: RegistrySet;
  files: ReadonlyArray<{ path: string; contents: string; generatedFrom: string }>;
  copiedAssets: ReadonlyArray<{ to: string; sha256: string }>;
  usedRecords: ReadonlyArray<{ kind: RegistryKind; id: string }>;
  acceptedRisks: AcceptedRisk[];
  gameLua: { available: boolean; commit: string; repository: string; license: string };
  toolkitVersion: string;
  includeTimestamp: boolean;
  warnings: readonly Diagnostic[];
}

export function buildManifest(input: BuildManifestInput): BuildManifest {
  const { project, registries } = input;

  const files: ManifestFileEntry[] = input.files
    .map((file) => ({
      path: file.path,
      sha256: sha256(file.contents),
      bytes: Buffer.byteLength(file.contents, 'utf8'),
      generatedFrom: file.generatedFrom,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  // Deduplicate the records the emitters reported using.
  const recordKeys = new Set<string>();
  const records: ManifestRecordEntry[] = [];
  const sourceIds = new Set<string>();

  for (const used of input.usedRecords) {
    const key = `${used.kind}:${used.id}`;
    if (recordKeys.has(key)) continue;
    recordKeys.add(key);

    const record = getRecord(registries, used.kind, used.id);
    if (!record) continue;

    for (const id of record.provenance.sources) sourceIds.add(id);
    records.push({
      registry: used.kind,
      id: record.id,
      verificationStatus: record.verificationStatus,
      sources: [...record.provenance.sources].sort(),
    });
  }

  records.sort((a, b) => `${a.registry}:${a.id}`.localeCompare(`${b.registry}:${b.id}`));

  const sources = [...sourceIds]
    .sort()
    .map((id) => registries.provenance.get(id))
    .filter((source): source is NonNullable<typeof source> => source !== undefined)
    .map((source) => ({
      id: source.id,
      type: source.type,
      title: source.title,
      ...(source.url ? { url: source.url } : {}),
      ...(source.commit ? { commit: source.commit } : {}),
      citation: ProvenanceIndex.cite(source),
    }));

  const manifest: BuildManifest = {
    manifestVersion: 1,
    toolkit: {
      name: 'springfield-after-hours-toolkit',
      version: input.toolkitVersion,
    },
    campaign: {
      id: project.campaign.id,
      title: project.campaign.title,
      version: project.campaign.version,
      internalName: project.campaign.internalName,
      declaredStatus: project.campaign.status,
    },
    files,
    assets: input.copiedAssets
      .map((asset) => ({ path: asset.to, sha256: asset.sha256 }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    provenance: { records, sources },
    upstream: {
      gameLua: {
        repository: input.gameLua.repository,
        commit: input.gameLua.commit,
        license: input.gameLua.license,
        installed: input.gameLua.available,
      },
    },
    acceptedRisks: [...input.acceptedRisks].sort((a, b) =>
      `${a.registry}:${a.reference}`.localeCompare(`${b.registry}:${b.reference}`),
    ),
    warnings: input.warnings
      .map((w) => ({ code: w.code, message: w.message }))
      .sort((a, b) => `${a.code}${a.message}`.localeCompare(`${b.code}${b.message}`)),
    disclaimer: [
      'A successful build means the generated scripts are internally consistent: every command exists in the pinned Game.lua, with a valid argument count and a legal scope.',
      'It does NOT mean this campaign has been run in the game, or that it is playable.',
      'Registry records marked "experimental" or accepted via allowUnverified have not been confirmed against a real game.',
      'This mod contains no assets from The Simpsons: Hit & Run or from any third-party community mod.',
    ],
  };

  if (input.includeTimestamp) {
    manifest.generatedAt = new Date().toISOString();
  }

  return manifest;
}
