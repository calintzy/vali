import { rules as valiRules } from '@promptnroll/vali/rules';
import type { Rule } from '@promptnroll/vali/types';
import { createESLintRule } from './adapter.js';

const eslintRules: Record<string, any> = {};
for (const rule of valiRules) {
  eslintRules[rule.name] = createESLintRule(rule);
}

const plugin: any = {
  meta: {
    name: 'eslint-plugin-vali',
    version: '0.4.0',
  },
  rules: eslintRules,
  configs: {} as Record<string, any>,
};

// recommended config (flat config)
plugin.configs.recommended = {
  plugins: { vali: plugin },
  rules: Object.fromEntries(
    valiRules.map(r => [`vali/${r.name}`, r.severity === 'error' ? 'error' : 'warn'])
  ),
};

/**
 * 커스텀 규칙을 ESLint 규칙으로 래핑하여 플러그인에 추가합니다.
 *
 * @example
 * import vali from 'eslint-plugin-vali';
 * import myRule from './custom-rules/my-rule.ts';
 * vali.addCustomRule(myRule);
 */
export function addCustomRule(rule: Rule): void {
  plugin.rules[rule.name] = createESLintRule(rule);
}

export default plugin;
