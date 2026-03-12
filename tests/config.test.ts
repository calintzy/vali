import { describe, it, expect } from 'vitest';
import { loadConfig, resolveRuleConfig, getDefaultConfig } from '../src/config/index.js';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

describe('Config', () => {
  describe('loadConfig', () => {
    it('기본 설정 반환 (설정 파일 없을 때)', () => {
      const config = loadConfig('/nonexistent/path');
      expect(config.rules).toBeDefined();
      expect(config.rules?.['VAL001']).toBe(true);
      expect(config.include).toEqual(['**/*.{ts,tsx,js,jsx}']);
    });

    it('프로젝트 루트의 .valirc.json 로드', () => {
      const config = loadConfig(PROJECT_ROOT);
      expect(config.rules).toBeDefined();
    });

    it('v0.2 규칙이 기본 설정에 포함', () => {
      const config = getDefaultConfig();
      expect(config.rules?.['VAL002']).toBe(true);
      expect(config.rules?.['VAL005']).toBeDefined();
      expect(config.rules?.['VAL006']).toBeDefined();
      expect(config.rules?.['VAL007']).toBe(true);
      expect(config.rules?.['VAL008']).toBeDefined();
      expect(config.rules?.['VAL010']).toBeDefined();
    });
  });

  describe('resolveRuleConfig', () => {
    it('boolean true → 기본 severity', () => {
      const config = { rules: { 'VAL001': true as const } };
      const resolved = resolveRuleConfig('VAL001', 'error', config);
      expect(resolved).toEqual({ enabled: true, severity: 'error', options: {} });
    });

    it('boolean false → disabled', () => {
      const config = { rules: { 'VAL001': false as const } };
      const resolved = resolveRuleConfig('VAL001', 'error', config);
      expect(resolved.enabled).toBe(false);
    });

    it('string severity → 해당 severity', () => {
      const config = { rules: { 'VAL003': 'info' as const } };
      const resolved = resolveRuleConfig('VAL003', 'warning', config);
      expect(resolved).toEqual({ enabled: true, severity: 'info', options: {} });
    });

    it('tuple [severity, options] → severity + options', () => {
      const config = { rules: { 'VAL004': ['info' as const, { threshold: 0.6 }] as const } };
      const resolved = resolveRuleConfig('VAL004', 'info', config);
      expect(resolved.enabled).toBe(true);
      expect(resolved.severity).toBe('info');
      expect(resolved.options).toEqual({ threshold: 0.6 });
    });

    it('undefined → 기본 설정', () => {
      const resolved = resolveRuleConfig('UNKNOWN', 'warning', {});
      expect(resolved).toEqual({ enabled: true, severity: 'warning', options: {} });
    });
  });
});
