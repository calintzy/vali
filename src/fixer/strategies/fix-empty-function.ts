import type { FixStrategy, FixAction, Diagnostic, RuleContext } from '../../types/index.js';

const fixEmptyFunction: FixStrategy = {
  ruleId: 'VAL003',

  canFix(diagnostic: Diagnostic): boolean {
    // TODO 주석만 있는 함수만 fix 가능
    return diagnostic.message.includes('TODO');
  },

  fix(diagnostic: Diagnostic, context: RuleContext): FixAction[] {
    const lines = context.fileContent.split('\n');
    // 함수 body의 닫는 중괄호 바로 앞에 throw 삽입
    const endLine = diagnostic.endLine ?? diagnostic.line;

    // 닫는 } 라인 찾기
    for (let i = endLine - 1; i >= diagnostic.line - 1; i--) {
      if (lines[i]?.trim() === '}') {
        // indent 맞추기
        const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
        return [{
          type: 'insert',
          line: i + 1, // } 바로 앞에 삽입
          newText: `${indent}  throw new Error('Not implemented');`,
        }];
      }
    }

    return [];
  },
};

export default fixEmptyFunction;
