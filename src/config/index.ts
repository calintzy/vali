import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValiConfig, RuleConfig, ResolvedRuleConfig, Severity } from '../types/index.js';

const DEFAULT_CONFIG: ValiConfig = {
  rules: {
    'VAL001': true,
    'VAL002': true,
    'VAL003': true,
    'VAL004': ['info', { threshold: 0.4 }],
    'VAL005': ['warning', { maxLayers: 3 }],
    'VAL006': ['warning', { minLines: 5, similarity: 0.9 }],
    'VAL007': true,
    'VAL008': ['warning', { allowAsync: true }],
    'VAL009': true,
    'VAL010': ['info', { minSize: 3 }],
  },
  include: ['**/*.{ts,tsx,js,jsx}'],
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    '**/*.d.ts',
    '**/*.min.js',
  ],
  customRules: [],
};

export function loadConfig(projectRoot: string, configPath?: string): ValiConfig {
  const filePath = configPath
    ? resolve(projectRoot, configPath)
    : resolve(projectRoot, '.valirc.json');

  if (!existsSync(filePath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const userConfig: ValiConfig = JSON.parse(raw);
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch {
    console.warn(`vali: warning — .valirc.json 파싱 실패, 기본 설정 사용`);
    return { ...DEFAULT_CONFIG };
  }
}

function mergeConfig(base: ValiConfig, user: ValiConfig): ValiConfig {
  return {
    rules: { ...base.rules, ...user.rules },
    include: user.include ?? base.include,
    exclude: user.exclude ?? base.exclude,
    customRules: user.customRules ?? base.customRules ?? [],
  };
}

export function resolveRuleConfig(
  ruleId: string,
  defaultSeverity: Severity,
  config: ValiConfig,
): ResolvedRuleConfig {
  const ruleConfig = config.rules?.[ruleId];

  if (ruleConfig === undefined || ruleConfig === true) {
    return { enabled: true, severity: defaultSeverity, options: {} };
  }

  if (ruleConfig === false) {
    return { enabled: false, severity: defaultSeverity, options: {} };
  }

  if (typeof ruleConfig === 'string') {
    return { enabled: true, severity: ruleConfig, options: {} };
  }

  if (Array.isArray(ruleConfig)) {
    const [severity, options = {}] = ruleConfig;
    return { enabled: true, severity, options };
  }

  return { enabled: true, severity: defaultSeverity, options: {} };
}

export function getDefaultConfig(): ValiConfig {
  return { ...DEFAULT_CONFIG };
}
