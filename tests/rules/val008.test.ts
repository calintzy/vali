import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val008 from '../../src/rules/val008-excessive-error.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/excessive-error');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'warning', options: { allowAsync: true } },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL008: excessive-error', () => {
  it('불필요한 try-catch 감지', () => {
    const ctx = createContext('sync-pure-trycatch.ts');
    const diagnostics = val008.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.every(d => d.ruleId === 'VAL008')).toBe(true);
  });

  it('불가능한 에러 케이스 감지 (impossibleError fixture)', () => {
    const ctx = createContext('impossible-error.ts');
    const diagnostics = val008.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0].message).toContain('에러를 발생시킬 수 있는 코드가 없습니다');
  });

  it('적절한 try-catch는 통과', () => {
    const ctx = createContext('proper-trycatch.ts');
    const diagnostics = val008.check(ctx);

    // JSON.parse와 await는 적절한 try-catch
    const unnecessaryDiags = diagnostics.filter(d =>
      d.message.includes('에러를 발생시킬 수 있는 코드가 없습니다')
    );
    expect(unnecessaryDiags.length).toBe(0);
  });
});
