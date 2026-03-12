import { SyntaxKind } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

// TypeChecker 없이도 감지 가능한 잘 알려진 환각 API 패턴
const KNOWN_HALLUCINATED_APIS: { method: string; suggestion: string }[] = [
  { method: 'groupBy', suggestion: 'Object.groupBy()를 사용하세요 (ES2024)' },
  { method: 'last', suggestion: '.at(-1)을 사용하세요' },
  { method: 'first', suggestion: '[0] 또는 .at(0)을 사용하세요' },
  { method: 'unique', suggestion: '[...new Set(arr)]을 사용하세요' },
  { method: 'compact', suggestion: '.filter(Boolean)을 사용하세요' },
  { method: 'flatten', suggestion: '.flat()을 사용하세요' },
  { method: 'contains', suggestion: '.includes()를 사용하세요' },
  { method: 'capitalize', suggestion: 'str[0].toUpperCase() + str.slice(1)을 사용하세요' },
  { method: 'deepCopy', suggestion: 'structuredClone()을 사용하세요' },
  { method: 'deepClone', suggestion: 'structuredClone()을 사용하세요' },
  { method: 'sleep', suggestion: 'new Promise(r => setTimeout(r, ms))를 사용하세요' },
  { method: 'delay', suggestion: 'new Promise(r => setTimeout(r, ms))를 사용하세요' },
  { method: 'clamp', suggestion: 'Math.min(Math.max(value, min), max)를 사용하세요' },
];

const HALLUCINATED_METHODS = new Map<string, { suggestion: string }>();
for (const api of KNOWN_HALLUCINATED_APIS) {
  HALLUCINATED_METHODS.set(api.method, { suggestion: api.suggestion });
}

const val002: Rule = {
  id: 'VAL002',
  name: 'hallucinated-api',
  description: '존재하지 않는 메서드/프로퍼티 호출을 감지합니다',
  severity: 'error',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath, typeChecker } = context;
    const diagnostics: Diagnostic[] = [];

    for (const propAccess of sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
      const nameNode = propAccess.getNameNode();
      const methodName = nameNode.getText();

      // optional chaining skip
      if (propAccess.hasQuestionDotToken()) continue;

      // TypeChecker 기반 검사
      if (typeChecker) {
        try {
          const expression = propAccess.getExpression();
          const type = expression.getType();
          const typeText = type.getText();

          // any/unknown 타입 skip
          if (type.isAny() || type.isUnknown() || type.isNever()) continue;
          if (typeText === 'any' || typeText === 'unknown') continue;

          // 해당 타입에 프로퍼티가 있는지 확인
          const property = type.getProperty(methodName);
          if (!property) {
            // 인덱스 시그니처 있으면 skip
            const numberIndex = type.getNumberIndexType();
            const stringIndex = type.getStringIndexType();
            if (numberIndex || stringIndex) continue;

            diagnostics.push({
              ruleId: 'VAL002',
              ruleName: 'hallucinated-api',
              severity: 'error',
              message: `'${typeText}'에 '${methodName}' 프로퍼티/메서드가 존재하지 않습니다`,
              file: filePath,
              line: propAccess.getStartLineNumber(),
              suggestion: `타입 '${typeText}'의 API를 확인하세요`,
            });
          }
        } catch {
          // 타입 추론 실패 시 skip
          continue;
        }
      } else {
        // TypeChecker 없을 때: 알려진 환각 API 패턴만 검사
        const info = HALLUCINATED_METHODS.get(methodName);
        if (!info) continue;

        // 호출 표현식의 일부인지 확인
        const parent = propAccess.getParent();
        if (parent?.getKind() !== SyntaxKind.CallExpression) continue;

        diagnostics.push({
          ruleId: 'VAL002',
          ruleName: 'hallucinated-api',
          severity: 'error',
          message: `'${methodName}'은(는) 존재하지 않는 API입니다`,
          file: filePath,
          line: propAccess.getStartLineNumber(),
          suggestion: info.suggestion,
        });
      }
    }

    return diagnostics;
  },
};

export default val002;
