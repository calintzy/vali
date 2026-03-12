import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val003 from '../../src/rules/val003-empty-function.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/empty-function');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'warning', options: {} },
    projectRoot: resolve(import.meta.dirname, '../..'),
  };
}

describe('VAL003: empty-function', () => {
  it('TODO만 있는 함수 감지', () => {
    const ctx = createContext('todo-only.ts');
    const diagnostics = val003.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.every(d => d.ruleId === 'VAL003')).toBe(true);
    expect(diagnostics.some(d => d.message.includes('TODO'))).toBe(true);
  });

  it('빈 body 함수 감지', () => {
    const ctx = createContext('empty-body.ts');
    const diagnostics = val003.check(ctx);

    // emptyFunc, emptyArrow (noop아님 - 변수명이 다름), emptyMethod
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.every(d => d.ruleId === 'VAL003')).toBe(true);
  });

  it('정상 구현 함수 + noop 패턴은 통과', () => {
    const ctx = createContext('normal-function.ts');
    const diagnostics = val003.check(ctx);

    // noop은 허용, 나머지는 구현 있음
    const nonNoop = diagnostics.filter(d => !d.message.includes('noop'));
    expect(nonNoop.length).toBe(0);
  });
});
