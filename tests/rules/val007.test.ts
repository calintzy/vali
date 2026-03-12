import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val007 from '../../src/rules/val007-dead-parameter.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/dead-parameter');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'warning', options: {} },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL007: dead-parameter', () => {
  it('미사용 마지막 파라미터 감지', () => {
    const ctx = createContext('unused-param.ts');
    const diagnostics = val007.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.every(d => d.ruleId === 'VAL007')).toBe(true);
    expect(diagnostics.some(d => d.message.includes('options'))).toBe(true);
  });

  it('모든 파라미터 사용 시 통과', () => {
    const ctx = createContext('used-param.ts');
    const diagnostics = val007.check(ctx);

    expect(diagnostics.length).toBe(0);
  });

  it('_ prefix 파라미터는 skip', () => {
    const ctx = createContext('underscore-param.ts');
    const diagnostics = val007.check(ctx);

    // _req는 skip, 중간 파라미터도 skip
    expect(diagnostics.length).toBe(0);
  });
});
