import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scanFiles } from '../src/analyzer/scanner.js';
import { runRules } from '../src/analyzer/runner.js';
import { rules } from '../src/rules/index.js';
import { loadConfig } from '../src/config/index.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('Integration: scanFiles → runRules 파이프라인', () => {
  it('fixture 파일을 스캔하고 규칙 실행', async () => {
    const config = loadConfig(PROJECT_ROOT);
    const files = await scanFiles('tests/fixtures/hallucinated-import', PROJECT_ROOT, config);

    expect(files.length).toBeGreaterThanOrEqual(1);

    const results = runRules(files, rules, config, PROJECT_ROOT);

    // bad-import.ts에서 이슈가 발견되어야 함
    expect(results.length).toBeGreaterThanOrEqual(1);
    const allDiags = results.flatMap(r => r.diagnostics);
    expect(allDiags.some(d => d.ruleId === 'VAL001')).toBe(true);
  });

  it('10개 규칙이 레지스트리에 등록', () => {
    expect(rules.length).toBe(10);
    const ids = rules.map(r => r.id);
    expect(ids).toContain('VAL001');
    expect(ids).toContain('VAL002');
    expect(ids).toContain('VAL003');
    expect(ids).toContain('VAL004');
    expect(ids).toContain('VAL005');
    expect(ids).toContain('VAL006');
    expect(ids).toContain('VAL007');
    expect(ids).toContain('VAL008');
    expect(ids).toContain('VAL009');
    expect(ids).toContain('VAL010');
  });

  it('fixable 규칙이 올바르게 표시', () => {
    const fixableRules = rules.filter(r => r.fixable);
    expect(fixableRules.length).toBe(1); // VAL007만 fixable: true 명시
    expect(fixableRules[0].id).toBe('VAL007');
  });

  it('dead-parameter fixture에서 파이프라인 완전 실행', async () => {
    const config = loadConfig(PROJECT_ROOT);
    const files = await scanFiles('tests/fixtures/dead-parameter', PROJECT_ROOT, config);

    expect(files.length).toBeGreaterThanOrEqual(2);

    const results = runRules(files, rules, config, PROJECT_ROOT);
    const val007Diags = results.flatMap(r => r.diagnostics).filter(d => d.ruleId === 'VAL007');

    // unused-param.ts에서 미사용 파라미터 감지
    expect(val007Diags.length).toBeGreaterThanOrEqual(1);
  });
});
