import type { FixStrategy, FixAction, Diagnostic, RuleContext } from '../../types/index.js';

const fixDeadParam: FixStrategy = {
  ruleId: 'VAL007',

  canFix(diagnostic: Diagnostic): boolean {
    // 마지막 파라미터인 경우만 fix 가능
    return diagnostic.message.includes('마지막 파라미터');
  },

  fix(diagnostic: Diagnostic, context: RuleContext): FixAction[] {
    const lines = context.fileContent.split('\n');
    const funcLine = lines[diagnostic.line - 1];

    // 파라미터 목록에서 마지막 파라미터를 찾아 제거
    // 패턴: , paramName: Type) 또는 , paramName)
    const paramMatch = diagnostic.message.match(/'(\w+)'/);
    if (!paramMatch) return [];

    const paramName = paramMatch[1];
    // ", paramName: Type" 또는 ", paramName" 패턴 제거
    const cleanedLine = funcLine
      .replace(new RegExp(`,\\s*${paramName}\\s*:\\s*[^,)]+(?=\\))`), '')
      .replace(new RegExp(`,\\s*${paramName}\\s*(?=\\))`), '');

    if (cleanedLine === funcLine) return [];

    return [{
      type: 'replace',
      line: diagnostic.line,
      oldText: funcLine,
      newText: cleanedLine,
    }];
  },
};

export default fixDeadParam;
