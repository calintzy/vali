import { describe, it, expect } from 'vitest';
import { calculateSlopScore } from '../../src/scorer/index.js';
import type { Diagnostic } from '../../src/types/index.js';

function makeDiagnostic(severity: 'error' | 'warning' | 'info'): Diagnostic {
  return {
    ruleId: 'TEST',
    ruleName: 'test',
    severity,
    message: 'test',
    file: 'test.ts',
    line: 1,
  };
}

describe('Scorer', () => {
  it('error 1개 → score 10', () => {
    const result = calculateSlopScore([makeDiagnostic('error')]);
    expect(result.score).toBe(10);
  });

  it('warning 2개 + info 1개 → score 12', () => {
    const result = calculateSlopScore([
      makeDiagnostic('warning'),
      makeDiagnostic('warning'),
      makeDiagnostic('info'),
    ]);
    expect(result.score).toBe(12);
  });

  it('문제 없음 → score 0, grade clean', () => {
    const result = calculateSlopScore([]);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('clean');
  });

  it('score 100 초과 → cap at 100', () => {
    const diagnostics = Array(15).fill(null).map(() => makeDiagnostic('error'));
    const result = calculateSlopScore(diagnostics);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('critical');
  });

  it('grade 분류 정확성', () => {
    expect(calculateSlopScore([makeDiagnostic('info')]).grade).toBe('low'); // 2
    expect(calculateSlopScore([
      makeDiagnostic('error'),
      makeDiagnostic('warning'),
      makeDiagnostic('info'),
    ]).grade).toBe('moderate'); // 10+5+2=17 → moderate
  });
});
