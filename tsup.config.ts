import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI 엔트리 (shebang 포함)
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    dts: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // 라이브러리 엔트리 (Public API)
  {
    entry: {
      'index': 'src/index.ts',
      'api/index': 'src/api/index.ts',
      'rules/index': 'src/rules/index.ts',
      'types/index': 'src/types/index.ts',
    },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    dts: true,
    splitting: true,
    treeshake: true,
  },
]);
