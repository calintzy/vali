import { defineRule } from '../src/api/define-rule.js';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM003',
  name: 'no-any-cast',
  description: 'as any 타입 단언을 금지합니다',
  severity: 'error',
  check({ sourceFile, filePath }) {
    const diagnostics = [];

    for (const asExpr of sourceFile.getDescendantsOfKind(SyntaxKind.AsExpression)) {
      const typeNode = asExpr.getTypeNode();
      if (typeNode && typeNode.getText() === 'any') {
        diagnostics.push({
          ruleId: 'CUSTOM003',
          ruleName: 'no-any-cast',
          severity: 'error' as const,
          message: '`as any` 타입 단언은 타입 안전성을 손상시킵니다',
          file: filePath,
          line: asExpr.getStartLineNumber(),
          suggestion: '구체적인 타입을 지정하거나 unknown으로 대체하세요',
        });
      }
    }

    return diagnostics;
  },
});
