import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Registry } from '@sah/registry';
import { validateCampaign } from '@sah/validator';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const registry = await Registry.fromFile(resolve(root, 'data/registries/core.yaml'));
const server = new McpServer({ name: 'springfield-after-hours-toolkit', version: '0.1.0' });
server.registerTool(
  'search_registry',
  {
    description: 'Search provenance-backed registry entries.',
    inputSchema: {
      kind: z.enum([
        'location',
        'map',
        'level',
        'interior',
        'locator',
        'character',
        'dialogue-code',
        'vehicle',
        'objective',
        'command',
        'launcher-hack',
        'asset',
        'hud-icon',
        'preset-capability',
        'compatibility-profile',
      ]),
      query: z.string().min(1),
    },
  },
  async ({ kind, query }) => ({
    content: [{ type: 'text', text: JSON.stringify(registry.search(kind, query)) }],
    structuredContent: { results: registry.search(kind, query) },
  }),
);
server.registerTool(
  'list_supported_objectives',
  { description: 'List objective capabilities and statuses.' },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(registry.search('objective', '')) }],
  }),
);
server.registerTool(
  'validate_campaign',
  {
    description: 'Validate structured campaign data without writing files.',
    inputSchema: { campaign: z.unknown() },
  },
  async ({ campaign }) => {
    const result = validateCampaign(campaign, registry);
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  },
);
server.registerTool(
  'get_capability_status',
  { description: 'Look up a capability by ID.', inputSchema: { id: z.string().min(1) } },
  async ({ id }) => ({
    content: [{ type: 'text', text: JSON.stringify(registry.get('objective', id) ?? null) }],
  }),
);
await server.connect(new StdioServerTransport());
