import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val001 from '../../src/rules/val001-hallucinated-import.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/hallucinated-import');
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

describe('VAL001: hallucinated-import', () => {
  it('존재하지 않는 패키지 import 감지', () => {
    const ctx = createContext('bad-import.ts');
    const diagnostics = val001.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.every(d => d.ruleId === 'VAL001')).toBe(true);
    expect(diagnostics.some(d => d.message.includes('express-validator/magic'))).toBe(true);
    expect(diagnostics.some(d => d.message.includes('totally-fake-package-xyz'))).toBe(true);
  });

  it('Node.js 내장 모듈 import는 통과', () => {
    const ctx = createContext('good-import.ts');
    const diagnostics = val001.check(ctx);

    expect(diagnostics.length).toBe(0);
  });
});
