import { defineRule } from '../src/api/define-rule.js';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM002',
  name: 'max-function-lines',
  description: '함수가 30줄을 초과하면 경고합니다',
  severity: 'warning',
  check({ sourceFile, filePath, config }) {
    const maxLines = (config.options.maxLines as number) ?? 30;
    const diagnostics = [];

    const functions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];

    for (const fn of functions) {
      const lineCount = fn.getEndLineNumber() - fn.getStartLineNumber() + 1;
      if (lineCount > maxLines) {
        const name = (fn as any).getName?.() ?? '(anonymous)';
        diagnostics.push({
          ruleId: 'CUSTOM002',
          ruleName: 'max-function-lines',
          severity: 'warning' as const,
          message: `함수 '${name}'이(가) ${lineCount}줄입니다 (최대: ${maxLines}줄)`,
          file: filePath,
          line: fn.getStartLineNumber(),
          endLine: fn.getEndLineNumber(),
          suggestion: `함수를 ${maxLines}줄 이하로 분리하세요`,
        });
      }
    }

    return diagnostics;
  },
});
