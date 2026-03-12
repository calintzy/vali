import { describe, it, expect } from 'vitest';
import { formatSarif } from '../../src/cli/formatters/sarif.js';
import type { ScanResult } from '../../src/types/index.js';

function createMockResult(diagnostics: any[] = []): ScanResult {
  return {
    files: [{
      file: 'src/test.ts',
      diagnostics,
    }],
    summary: {
      totalFiles: 1,
      filesWithIssues: diagnostics.length > 0 ? 1 : 0,
      errorCount: diagnostics.filter(d => d.severity === 'error').length,
      warningCount: diagnostics.filter(d => d.severity === 'warning').length,
      infoCount: diagnostics.filter(d => d.severity === 'info').length,
    },
    score: { score: 80, grade: 'low' },
  };
}

describe('SARIF Formatter', () => {
  it('유효한 SARIF v2.1.0 구조 생성', () => {
    const result = createMockResult();
    const output = formatSarif(result, '/project');
    const sarif = JSON.parse(output);

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('vali');
  });

  it('10개 규칙을 rules 배열에 포함', () => {
    const result = createMockResult();
    const sarif = JSON.parse(formatSarif(result, '/project'));

    expect(sarif.runs[0].tool.driver.rules.length).toBe(10);
    expect(sarif.runs[0].tool.driver.rules[0].id).toBe('VAL001');
  });

  it('diagnostic을 SARIF result로 변환', () => {
    const result = createMockResult([{
      ruleId: 'VAL001',
      ruleName: 'hallucinated-import',
      severity: 'error',
      message: 'Test error',
      file: 'src/test.ts',
      line: 10,
      endLine: 12,
      suggestion: 'Fix it',
    }]);
    const sarif = JSON.parse(formatSarif(result, '/project'));

    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].ruleId).toBe('VAL001');
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[0].message.text).toContain('Test error');
    expect(sarif.runs[0].results[0].message.text).toContain('Fix it');
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.region.startLine).toBe(10);
  });

  it('severity 매핑 (error→error, warning→warning, info→note)', () => {
    const result = createMockResult([
      { ruleId: 'VAL001', ruleName: 'test', severity: 'error', message: 'e', file: 'a.ts', line: 1 },
      { ruleId: 'VAL002', ruleName: 'test', severity: 'warning', message: 'w', file: 'a.ts', line: 2 },
      { ruleId: 'VAL003', ruleName: 'test', severity: 'info', message: 'i', file: 'a.ts', line: 3 },
    ]);
    const sarif = JSON.parse(formatSarif(result, '/project'));

    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[1].level).toBe('warning');
    expect(sarif.runs[0].results[2].level).toBe('note');
  });
});
