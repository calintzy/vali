import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val002 from '../../src/rules/val002-hallucinated-api.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/hallucinated-api');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'error', options: {} },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL002: hallucinated-api', () => {
  it('존재하지 않는 API 호출 감지 (알려진 패턴)', () => {
    const ctx = createContext('bad-api.ts');
    const diagnostics = val002.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.every(d => d.ruleId === 'VAL002')).toBe(true);
  });

  it('표준 API 호출은 통과', () => {
    const ctx = createContext('good-api.ts');
    const diagnostics = val002.check(ctx);

    expect(diagnostics.length).toBe(0);
  });
});
