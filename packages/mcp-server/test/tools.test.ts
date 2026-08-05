import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRegistries } from '@sah/registry';
import { createSandbox } from '../src/sandbox.js';
import { TOOLS, type ToolContext } from '../src/tools.js';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const context: ToolContext = {
  sandbox: createSandbox(repoRoot),
  registries: loadRegistries(),
  toolkitVersion: '0.1.0',
};

function run(name: string, args: Record<string, unknown> = {}): Record<string, unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool.handler(args, context) as Record<string, unknown>;
}

describe('tool surface', () => {
  it('exposes the documented tool set', () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      'compile_campaign',
      'create_dialogue_scaffold',
      'create_mission_scaffold',
      'explain_diagnostic',
      'get_capability_status',
      'get_registry_record',
      'list_supported_objectives',
      'preview_generated_files',
      'run_toolkit_doctor',
      'search_registry',
      'validate_campaign',
      'validate_mission',
    ]);
  });

  it('gives every tool a description', () => {
    for (const tool of TOOLS) {
      expect(tool.description.length, `${tool.name} needs a description`).toBeGreaterThan(20);
    }
  });
});

describe('search_registry', () => {
  it('finds verified content', () => {
    const result = run('search_registry', { query: 'Comic Book Guy', kind: 'characters' });
    expect(result['count']).toBe(1);
  });

  it('tells the model not to invent content when nothing matches', () => {
    const result = run('search_registry', { query: 'Java Server', kind: 'locations' });
    expect(result['count']).toBe(0);
    expect(String(result['guidance'])).toMatch(/do NOT invent/i);
  });
});

describe('get_registry_record', () => {
  it('returns provenance for a real record', () => {
    const result = run('get_registry_record', { kind: 'characters', id: 'cbg' });
    expect(result['found']).toBe(true);
    const provenance = result['provenance'] as { sources: Array<{ id: string }> };
    expect(provenance.sources.length).toBeGreaterThan(0);
  });

  it('does not treat a missing record as licence to invent one', () => {
    const result = run('get_registry_record', { kind: 'vehicles', id: 'honor-roller' });
    expect(result['found']).toBe(false);
    expect(String(result['guidance'])).toMatch(/invent/i);
  });
});

describe('validate_campaign', () => {
  it('reports success for the minimal campaign', () => {
    const result = run('validate_campaign', { path: 'examples/minimal-campaign' });
    expect(result['ok']).toBe(true);
  });

  it('returns structured diagnostics for the flagship example', () => {
    const result = run('validate_campaign', { path: 'examples/springfield-after-hours' });
    expect(result['ok']).toBe(false);
    const diagnostics = result['diagnostics'] as Array<{ code: string; severity: string }>;
    expect(diagnostics.some((d) => d.code === 'SAH2001')).toBe(true);
  });

  it('refuses a path outside the workspace', () => {
    expect(() => run('validate_campaign', { path: '../../../etc' })).toThrow();
  });
});

describe('compile_campaign', () => {
  it('defaults to a dry run so a model cannot write files by accident', () => {
    const result = run('compile_campaign', { path: 'examples/minimal-campaign' });
    expect(result['dryRun']).toBe(true);
    expect(result['ok']).toBe(true);
  });

  it('refuses to compile a campaign that fails validation', () => {
    const result = run('compile_campaign', { path: 'fixtures/invalid/unresolved-references' });
    expect(result['ok']).toBe(false);
  });
});

describe('preview_generated_files', () => {
  it('returns file contents without writing anything', () => {
    const result = run('preview_generated_files', {
      path: 'examples/minimal-campaign',
      file: 'Meta.ini',
    });
    expect(result['ok']).toBe(true);
    const files = result['files'] as Array<{ path: string; contents: string }>;
    expect(files[0]?.contents).toContain('[Miscellaneous]');
  });
});

describe('scaffolding tools', () => {
  it('returns mission content rather than writing it', () => {
    const result = run('create_mission_scaffold', { id: 'test-mission', title: 'Test Mission' });
    expect(result['suggestedPath']).toBe('missions/test-mission.yaml');
    expect(String(result['contents'])).toContain('id: test-mission');
    // The returned scaffold must itself be buildable advice.
    expect(String(result['contents'])).toContain('type: dummy');
  });

  it('refuses dialogue whose speakers are not verified characters', () => {
    const result = run('create_dialogue_scaffold', {
      id: 'test-convo',
      title: 'Test',
      lines: [{ speaker: 'definitely-not-a-character', text: 'Hello' }],
    });
    expect(result['ok']).toBe(false);
    expect(result['unresolvedSpeakers']).toEqual(['definitely-not-a-character']);
  });

  it('accepts dialogue whose speakers are verified', () => {
    const result = run('create_dialogue_scaffold', {
      id: 'test-convo',
      title: 'Test',
      lines: [
        { speaker: 'bart', text: 'Hello.' },
        { speaker: 'cbg', text: 'Worst greeting ever.' },
      ],
    });
    expect(result['ok']).toBe(true);
    expect(String(result['contents'])).toContain('speaker: cbg');
  });
});

describe('explain_diagnostic', () => {
  it('explains a known code', () => {
    const result = run('explain_diagnostic', { code: 'sah2001' });
    expect(result['found']).toBe(true);
    expect(result['title']).toBeTypeOf('string');
  });

  it('lists known codes when asked about an unknown one', () => {
    const result = run('explain_diagnostic', { code: 'SAH9999' });
    expect(result['found']).toBe(false);
    expect((result['knownCodes'] as string[]).length).toBeGreaterThan(0);
  });
});

describe('get_capability_status', () => {
  it('reports unsupported for features this game does not have', () => {
    const result = run('get_capability_status', { capability: 'time of day' });
    const matches = result['matches'] as Array<{ id: string; status: string }>;
    expect(matches.some((m) => m.status === 'unsupported')).toBe(true);
  });
});

describe('run_toolkit_doctor', () => {
  it('reports key presence without ever returning the key', () => {
    const result = run('run_toolkit_doctor');
    expect(result).toHaveProperty('anthropicApiKeyPresent');
    expect(typeof result['anthropicApiKeyPresent']).toBe('boolean');

    // Nothing in the response may resemble a credential.
    const serialised = JSON.stringify(result);
    expect(serialised).not.toMatch(/sk-ant-/);
    expect(serialised).not.toContain('ANTHROPIC_API_KEY=');
  });

  it('names the registries that are empty, so gaps are visible', () => {
    const result = run('run_toolkit_doctor');
    const registries = result['registries'] as { emptyRegistries: string[] };
    expect(registries.emptyRegistries).toContain('locations');
    expect(registries.emptyRegistries).toContain('vehicles');
  });
});
