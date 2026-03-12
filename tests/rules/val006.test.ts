import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val006 from '../../src/rules/val006-near-duplicate.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/near-duplicate');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'warning', options: { minLines: 5, similarity: 0.9 } },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL006: near-duplicate', () => {
  it('유사 함수 쌍 감지', () => {
    const ctx = createContext('similar-functions.ts');
    const diagnostics = val006.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.some(d => d.message.includes('유사'))).toBe(true);
  });

  it('다른 로직의 함수는 통과', () => {
    const ctx = createContext('different-functions.ts');
    const diagnostics = val006.check(ctx);

    expect(diagnostics.length).toBe(0);
  });
});
