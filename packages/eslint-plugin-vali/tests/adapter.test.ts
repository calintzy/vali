import { describe, it, expect } from 'vitest';
import { createESLintRule } from '../src/adapter.js';
import type { Rule } from '../../../src/types/index.js';

const mockRule: Rule = {
  id: 'VAL_TEST',
  name: 'test-rule',
  description: 'Test rule for adapter',
  severity: 'warning',

  check(context) {
    const diagnostics = [];
    if (context.fileContent.includes('BAD_CODE')) {
      diagnostics.push({
        ruleId: 'VAL_TEST',
        ruleName: 'test-rule',
        severity: 'warning' as const,
        message: 'Found BAD_CODE',
        file: context.filePath,
        line: 1,
        endLine: 1,
      });
    }
    return diagnostics;
  },
};

describe('ESLint Adapter', () => {
  it('Vali Rule을 ESLint Rule 형식으로 변환', () => {
    const eslintRule = createESLintRule(mockRule);

    expect(eslintRule.meta.type).toBe('suggestion');
    expect(eslintRule.meta.docs.description).toBe('Test rule for adapter');
    expect(eslintRule.meta.messages).toHaveProperty('VAL_TEST');
    expect(typeof eslintRule.create).toBe('function');
  });

  it('fixable 속성 매핑', () => {
    const fixableRule: Rule = { ...mockRule, fixable: true };
    const eslintRule = createESLintRule(fixableRule);
    expect(eslintRule.meta.fixable).toBe('code');

    const nonFixableRule: Rule = { ...mockRule, fixable: false };
    const eslintRule2 = createESLintRule(nonFixableRule);
    expect(eslintRule2.meta.fixable).toBeUndefined();
  });

  it('create 함수가 Program visitor 반환', () => {
    const eslintRule = createESLintRule(mockRule);

    const mockContext = {
      getFilename: () => 'test.ts',
      getSourceCode: () => ({
        getText: () => 'const x = 1;',
      }),
      report: () => {},
    };

    const visitors = eslintRule.create(mockContext);
    expect(visitors).toHaveProperty('Program');
    expect(typeof visitors.Program).toBe('function');
  });

  it('BAD_CODE가 있으면 report 호출', () => {
    const eslintRule = createESLintRule(mockRule);
    const reports: any[] = [];

    const mockContext = {
      getFilename: () => 'test.ts',
      getSourceCode: () => ({
        getText: () => 'const x = BAD_CODE;',
      }),
      report: (r: any) => reports.push(r),
    };

    const visitors = eslintRule.create(mockContext);
    visitors.Program({ type: 'Program' });

    expect(reports.length).toBeGreaterThanOrEqual(1);
    expect(reports[0].messageId).toBe('VAL_TEST');
  });

  it('정상 코드에서는 report 미호출', () => {
    const eslintRule = createESLintRule(mockRule);
    const reports: any[] = [];

    const mockContext = {
      getFilename: () => 'test.ts',
      getSourceCode: () => ({
        getText: () => 'const x = GOOD_CODE;',
      }),
      report: (r: any) => reports.push(r),
    };

    const visitors = eslintRule.create(mockContext);
    visitors.Program({ type: 'Program' });

    expect(reports).toHaveLength(0);
  });
});
