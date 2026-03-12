import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val010 from '../../src/rules/val010-unused-abstraction.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/unused-abstraction');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'info', options: { minSize: 3 } },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL010: unused-abstraction', () => {
  it('1회 사용 인터페이스 감지', () => {
    const ctx = createContext('single-use.ts');
    const diagnostics = val010.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.some(d => d.message.includes('DataProcessor'))).toBe(true);
  });

  it('다회 사용 인터페이스는 통과', () => {
    const ctx = createContext('multi-use.ts');
    const diagnostics = val010.check(ctx);

    // Logger는 여러 곳에서 사용되므로 통과
    const loggerDiags = diagnostics.filter(d => d.message.includes('Logger'));
    expect(loggerDiags.length).toBe(0);
  });
});
