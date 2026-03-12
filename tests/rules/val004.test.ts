import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import val004 from '../../src/rules/val004-comment-bloat.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/comment-bloat');

function createContext(fixtureName: string, threshold = 0.4): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: readFileSync(filePath, 'utf-8'),
    config: { enabled: true, severity: 'info', options: { threshold } },
    projectRoot: resolve(import.meta.dirname, '../..'),
  };
}

describe('VAL004: comment-bloat', () => {
  it('주석 비율 높은 파일 감지', () => {
    const ctx = createContext('high-ratio.ts');
    const diagnostics = val004.check(ctx);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].ruleId).toBe('VAL004');
    expect(diagnostics[0].message).toContain('%');
  });

  it('정상 비율 파일은 통과', () => {
    const ctx = createContext('normal-ratio.ts');
    const diagnostics = val004.check(ctx);

    expect(diagnostics.length).toBe(0);
  });

  it('커스텀 threshold 적용', () => {
    const ctx = createContext('high-ratio.ts', 0.9);
    const diagnostics = val004.check(ctx);

    // 임계값 90%로 높이면 통과할 수 있음
    expect(diagnostics.length).toBe(0);
  });
});
