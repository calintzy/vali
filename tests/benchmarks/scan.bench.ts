import { describe, bench } from 'vitest';
import { resolve } from 'node:path';
import { scanFiles } from '../../src/analyzer/scanner.js';
import { runRules } from '../../src/analyzer/runner.js';
import { rules } from '../../src/rules/index.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

describe('Performance Benchmarks', () => {
  bench('src/ 디렉토리 스캔', async () => {
    const files = await scanFiles('src', PROJECT_ROOT, {});
    expect(files.length).toBeGreaterThan(0);
  });

  bench('전체 규칙 실행 (src/)', async () => {
    const files = await scanFiles('src', PROJECT_ROOT, {});
    runRules(files, rules, {}, PROJECT_ROOT);
  });
});
