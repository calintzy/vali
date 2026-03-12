import { defineRule } from '../src/api/define-rule.js';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: '프로덕션 코드에서 console.log 사용을 금지합니다',
  severity: 'warning',
  check({ sourceFile, filePath }) {
    const diagnostics = [];

    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const text = call.getExpression().getText();
      if (text === 'console.log') {
        diagnostics.push({
          ruleId: 'CUSTOM001',
          ruleName: 'no-console-log',
          severity: 'warning' as const,
          message: 'console.log를 사용하지 마세요',
          file: filePath,
          line: call.getStartLineNumber(),
          suggestion: 'logger 라이브러리를 사용하거나 console.log를 제거하세요',
        });
      }
    }

    return diagnostics;
  },
});
