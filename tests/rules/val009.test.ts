import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import val009 from '../../src/rules/val009-ai-boilerplate.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/ai-boilerplate');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: readFileSync(filePath, 'utf-8'),
    config: { enabled: true, severity: 'info', options: {} },
    projectRoot: resolve(import.meta.dirname, '../..'),
  };
}

describe('VAL009: ai-boilerplate', () => {
  it('"This file contains..." 서문 감지', () => {
    const ctx = createContext('ai-header.ts');
    const diagnostics = val009.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics[0].ruleId).toBe('VAL009');
    expect(diagnostics.some(d => d.message.includes('파일 설명 서문') || d.message.includes('유틸리티'))).toBe(true);
  });

  it('일반 코드 파일은 통과', () => {
    const ctx = createContext('normal-header.ts');
    const diagnostics = val009.check(ctx);

    expect(diagnostics.length).toBe(0);
  });
});
