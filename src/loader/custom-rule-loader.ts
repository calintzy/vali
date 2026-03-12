import fg from 'fast-glob';
import type { Rule, CustomRuleLoadResult, CustomRuleError } from '../types/index.js';

/**
 * .valirc.json의 customRules 글로브 패턴으로 커스텀 규칙을 로드합니다.
 */
export async function loadCustomRules(
  patterns: string[],
  projectRoot: string,
): Promise<CustomRuleLoadResult> {
  const rules: Rule[] = [];
  const errors: CustomRuleError[] = [];

  const files = await fg(patterns, {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
  });

  for (const filePath of files) {
    try {
      const mod = await import(filePath);
      const rule = mod.default ?? mod;
      validateRule(rule, filePath);
      rules.push(rule);
    } catch (err) {
      errors.push({
        path: filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rules, errors };
}

function validateRule(rule: unknown, filePath: string): asserts rule is Rule {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`'${filePath}'에서 Rule 객체를 export하지 않습니다`);
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new Error(`Rule.id가 없거나 유효하지 않습니다`);
  }
  if (typeof r.name !== 'string' || r.name.length === 0) {
    throw new Error(`Rule.name이 없거나 유효하지 않습니다`);
  }
  if (typeof r.check !== 'function') {
    throw new Error(`Rule.check이 함수가 아닙니다`);
  }
}
