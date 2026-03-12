import { describe, it, expect } from 'vitest';
import { Fixer } from '../src/fixer/index.js';
import type { Diagnostic, RuleContext, FixStrategy } from '../src/types/index.js';
import { parseFile } from '../src/analyzer/parser.js';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

function createMockStrategy(): FixStrategy {
  return {
    ruleId: 'VAL_TEST',
    canFix: () => true,
    fix: (diag) => [{
      type: 'replace' as const,
      line: diag.line,
      oldText: 'BAD',
      newText: 'GOOD',
    }],
  };
}

function createMockContext(content: string): RuleContext {
  const filePath = resolve(PROJECT_ROOT, 'tests/fixtures/empty-function/normal-function.ts');
  const sourceFile = parseFile(filePath)!;
  return {
    sourceFile,
    filePath,
    fileContent: content,
    config: { enabled: true, severity: 'warning', options: {} },
    projectRoot: PROJECT_ROOT,
  };
}

describe('Fixer', () => {
  it('전략 등록 및 수정 적용', () => {
    const fixer = new Fixer();
    const strategy = createMockStrategy();
    fixer.register(strategy);

    const diag: Diagnostic = {
      ruleId: 'VAL_TEST',
      ruleName: 'test',
      severity: 'warning',
      message: 'test',
      file: 'test.ts',
      line: 1,
    };

    const ctx = createMockContext('const x = BAD;');
    const result = fixer.fix([diag], ctx, { dryRun: true });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].ruleId).toBe('VAL_TEST');
  });

  it('canFix가 false면 skip', () => {
    const fixer = new Fixer();
    fixer.register({
      ruleId: 'VAL_TEST',
      canFix: () => false,
      fix: () => [],
    });

    const diag: Diagnostic = {
      ruleId: 'VAL_TEST',
      ruleName: 'test',
      severity: 'warning',
      message: 'test',
      file: 'test.ts',
      line: 1,
    };

    const ctx = createMockContext('const x = 1;');
    const result = fixer.fix([diag], ctx, { dryRun: true });

    expect(result.skipped).toHaveLength(1);
    expect(result.applied).toHaveLength(0);
  });

  it('dryRun=false일 때 실제 수정 반환', () => {
    const fixer = new Fixer();
    const strategy = createMockStrategy();
    fixer.register(strategy);

    const diag: Diagnostic = {
      ruleId: 'VAL_TEST',
      ruleName: 'test',
      severity: 'warning',
      message: 'test',
      file: 'test.ts',
      line: 1,
    };

    const ctx = createMockContext('const x = BAD;');
    const result = fixer.fix([diag], ctx, { dryRun: false });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].description).toBeDefined();
  });

  it('여러 진단에 대해 각각 수정 적용', () => {
    const fixer = new Fixer();
    fixer.register(createMockStrategy());

    const diags: Diagnostic[] = [
      { ruleId: 'VAL_TEST', ruleName: 'test', severity: 'warning', message: 'a', file: 'test.ts', line: 1 },
      { ruleId: 'VAL_TEST', ruleName: 'test', severity: 'warning', message: 'b', file: 'test.ts', line: 2 },
    ];

    const ctx = createMockContext('const x = BAD;\nconst y = BAD;');
    const result = fixer.fix(diags, ctx, { dryRun: true });

    expect(result.applied).toHaveLength(2);
  });

  it('등록되지 않은 규칙은 무시', () => {
    const fixer = new Fixer();

    const diag: Diagnostic = {
      ruleId: 'UNKNOWN',
      ruleName: 'test',
      severity: 'warning',
      message: 'test',
      file: 'test.ts',
      line: 1,
    };

    const ctx = createMockContext('const x = 1;');
    const result = fixer.fix([diag], ctx, { dryRun: true });

    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});
