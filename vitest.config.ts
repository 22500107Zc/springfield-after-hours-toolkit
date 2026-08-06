import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

/**
 * Tests run against package *sources*, not build output, so `npm test` does
 * not require `npm run build` first. The aliases below mirror the workspace
 * dependency graph.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@sah/core': pkg('core'),
      '@sah/schemas': pkg('schemas'),
      '@sah/registry': pkg('registry'),
      '@sah/validator': pkg('validator'),
      '@sah/compiler': pkg('compiler'),
      '@sah/adapter-game-lua': pkg('adapter-game-lua'),
      '@sah/game-lua-definitions': pkg('game-lua-definitions'),
      '@sah/adapter-lucas-launcher': pkg('adapter-lucas-launcher'),
      '@sah/plugin-sdk': pkg('plugin-sdk'),
      '@sah/ai': pkg('ai'),
      '@sah/mcp-server': pkg('mcp-server'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
  },
});
