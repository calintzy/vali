import type { FixStrategy, FixAction, Diagnostic, RuleContext } from '../../types/index.js';

const fixAiBoilerplate: FixStrategy = {
  ruleId: 'VAL009',

  canFix(): boolean {
    return true;
  },

  fix(diagnostic: Diagnostic, context: RuleContext): FixAction[] {
    const lines = context.fileContent.split('\n');
    const lineIdx = diagnostic.line - 1;
    const line = lines[lineIdx]?.trim() ?? '';

    // 블록 주석인 경우 endLine까지 제거
    if (line.startsWith('/*')) {
      const endLine = diagnostic.endLine ?? diagnostic.line;
      return [{
        type: 'remove',
        line: diagnostic.line,
        endLine,
      }];
    }

    // 단일 줄 주석 제거
    return [{
      type: 'remove',
      line: diagnostic.line,
    }];
  },
};

export default fixAiBoilerplate;
