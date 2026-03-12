import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import val005 from '../../src/rules/val005-over-engineered.js';
import { parseFile } from '../../src/analyzer/parser.js';
import type { RuleContext } from '../../src/types/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/over-engineered');
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

function createContext(fixtureName: string): RuleContext {
  const filePath = resolve(FIXTURES, fixtureName);
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: sourceFile.getFullText(),
    config: { enabled: true, severity: 'warning', options: { maxLayers: 3 } },
    projectRoot: PROJECT_ROOT,
  };
}

describe('VAL005: over-engineered', () => {
  it('불필요한 Factory 패턴 감지', () => {
    const ctx = createContext('unnecessary-factory.ts');
    const diagnostics = val005.check(ctx);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(diagnostics.some(d => d.message.includes('Factory'))).toBe(true);
  });

  it('적절한 추상화는 통과', () => {
    const ctx = createContext('proper-abstraction.ts');
    const diagnostics = val005.check(ctx);

    // createLogger는 추가 로직이 있으므로 통과
    const factoryDiags = diagnostics.filter(d => d.message.includes('Factory'));
    expect(factoryDiags.length).toBe(0);
  });
});
