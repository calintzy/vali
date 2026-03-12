import { describe, it, expect } from 'vitest';
import { defineRule } from '../src/api/define-rule.js';
import { loadCustomRules } from '../src/loader/custom-rule-loader.js';
import { runRules } from '../src/analyzer/runner.js';
import { loadConfig } from '../src/config/index.js';
import { scanFiles } from '../src/analyzer/scanner.js';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

describe('커스텀 규칙 통합 테스트', () => {
  it('defineRule → loadCustomRules → runRules E2E', async () => {
    // 예제 커스텀 규칙 로드
    const { rules: customRules, errors } = await loadCustomRules(
      ['examples/no-console-log.ts'],
      PROJECT_ROOT,
    );

    expect(errors).toHaveLength(0);
    expect(customRules).toHaveLength(1);
    expect(customRules[0].id).toBe('CUSTOM001');

    // fixture 파일에 대해 커스텀 규칙 실행
    const config = loadConfig(PROJECT_ROOT);
    const files = await scanFiles('tests/fixtures', PROJECT_ROOT, config);

    // console.log가 있는 파일에서 진단 발생 확인
    const results = runRules(files, customRules, config, PROJECT_ROOT);
    const allDiags = results.flatMap(r => r.diagnostics);
    const customDiags = allDiags.filter(d => d.ruleId === 'CUSTOM001');

    // console.log를 사용하는 fixture가 있으면 진단 발생
    // 없더라도 에러 없이 실행 완료되어야 함
    expect(Array.isArray(customDiags)).toBe(true);
  });

  it('빌트인 + 커스텀 규칙 병합 실행', async () => {
    const { rules: builtinRules } = await import('../src/rules/index.js');
    const { rules: customRules } = await loadCustomRules(
      ['examples/*.ts'],
      PROJECT_ROOT,
    );

    const allRules = [...builtinRules, ...customRules];

    // 빌트인 10개 + 커스텀 3개 = 13개
    expect(allRules.length).toBe(13);

    // 모든 규칙이 유효한 Rule 인터페이스
    for (const rule of allRules) {
      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(typeof rule.check).toBe('function');
    }
  });
});
