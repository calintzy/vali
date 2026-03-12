import { describe, it, expect } from 'vitest';
import { defineRule } from '../../src/api/define-rule.js';

describe('defineRule', () => {
  it('필수 필드로 규칙 생성', () => {
    const rule = defineRule({
      id: 'TEST001',
      name: 'test-rule',
      description: '테스트 규칙',
      check: () => [],
    });

    expect(rule.id).toBe('TEST001');
    expect(rule.name).toBe('test-rule');
    expect(rule.description).toBe('테스트 규칙');
    expect(rule.severity).toBe('warning');
    expect(rule.fixable).toBe(false);
    expect(typeof rule.check).toBe('function');
  });

  it('기본값 적용 — severity warning, fixable false', () => {
    const rule = defineRule({
      id: 'TEST002',
      name: 'defaults',
      check: () => [],
    });

    expect(rule.severity).toBe('warning');
    expect(rule.fixable).toBe(false);
    expect(rule.description).toBe('');
  });

  it('커스텀 severity와 fixable 설정', () => {
    const rule = defineRule({
      id: 'TEST003',
      name: 'custom-opts',
      severity: 'error',
      fixable: true,
      check: () => [],
    });

    expect(rule.severity).toBe('error');
    expect(rule.fixable).toBe(true);
  });

  it('id 누락 시 에러', () => {
    expect(() => defineRule({
      id: '',
      name: 'no-id',
      check: () => [],
    })).toThrow('defineRule: id는 필수 문자열입니다');
  });

  it('name 누락 시 에러', () => {
    expect(() => defineRule({
      id: 'TEST',
      name: '',
      check: () => [],
    })).toThrow('defineRule: name은 필수 문자열입니다');
  });

  it('check가 함수가 아니면 에러', () => {
    expect(() => defineRule({
      id: 'TEST',
      name: 'bad',
      check: 'not a function' as any,
    })).toThrow('defineRule: check는 필수 함수입니다');
  });
});
