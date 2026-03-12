import { describe, it, expect } from 'vitest';
import { loadCustomRules } from '../../src/loader/custom-rule-loader.js';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

describe('loadCustomRules', () => {
  it('글로브 패턴으로 예제 규칙 로드', async () => {
    const { rules, errors } = await loadCustomRules(
      ['examples/no-console-log.ts'],
      PROJECT_ROOT,
    );

    expect(errors).toHaveLength(0);
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('CUSTOM001');
    expect(rules[0].name).toBe('no-console-log');
    expect(typeof rules[0].check).toBe('function');
  });

  it('여러 패턴으로 복수 규칙 로드', async () => {
    const { rules, errors } = await loadCustomRules(
      ['examples/*.ts'],
      PROJECT_ROOT,
    );

    expect(errors).toHaveLength(0);
    expect(rules.length).toBeGreaterThanOrEqual(3);
  });

  it('존재하지 않는 패턴은 빈 배열 반환', async () => {
    const { rules, errors } = await loadCustomRules(
      ['nonexistent/*.ts'],
      PROJECT_ROOT,
    );

    expect(rules).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
