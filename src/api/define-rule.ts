import type { Rule, DefineRuleOptions } from '../types/index.js';

/**
 * 커스텀 Vali 규칙을 정의합니다.
 *
 * @example
 * import { defineRule } from 'vali';
 *
 * export default defineRule({
 *   id: 'CUSTOM001',
 *   name: 'no-console-log',
 *   description: '프로덕션 코드에서 console.log 금지',
 *   check({ sourceFile, filePath }) {
 *     const diagnostics = [];
 *     // AST 검사 로직
 *     return diagnostics;
 *   },
 * });
 */
export function defineRule(options: DefineRuleOptions): Rule {
  if (!options.id || typeof options.id !== 'string') {
    throw new Error('defineRule: id는 필수 문자열입니다');
  }
  if (!options.name || typeof options.name !== 'string') {
    throw new Error('defineRule: name은 필수 문자열입니다');
  }
  if (typeof options.check !== 'function') {
    throw new Error('defineRule: check는 필수 함수입니다');
  }

  return {
    id: options.id,
    name: options.name,
    description: options.description ?? '',
    severity: options.severity ?? 'warning',
    fixable: options.fixable ?? false,
    check: options.check,
  };
}
