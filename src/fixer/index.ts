import { readFileSync, writeFileSync } from 'node:fs';
import type { Diagnostic, RuleContext, FixStrategy, FixResult, FixAction, AppliedFix, SkippedFix } from '../types/index.js';

export class Fixer {
  private strategies = new Map<string, FixStrategy>();

  register(strategy: FixStrategy): void {
    this.strategies.set(strategy.ruleId, strategy);
  }

  fix(
    diagnostics: Diagnostic[],
    context: RuleContext,
    options: { dryRun: boolean },
  ): FixResult {
    const applied: AppliedFix[] = [];
    const skipped: SkippedFix[] = [];

    // fixable 규칙의 diagnostic만 필터링
    const fixableDiags = diagnostics.filter(d => this.strategies.has(d.ruleId));

    // 줄 번호 역순 정렬 (뒤에서부터 수정해야 줄 번호 안 밀림)
    const sorted = [...fixableDiags].sort((a, b) => b.line - a.line);

    const lines = context.fileContent.split('\n');

    for (const diag of sorted) {
      const strategy = this.strategies.get(diag.ruleId)!;

      if (!strategy.canFix(diag, context)) {
        skipped.push({
          ruleId: diag.ruleId,
          line: diag.line,
          reason: '안전하지 않은 변환',
        });
        continue;
      }

      const actions = strategy.fix(diag, context);
      for (const action of actions) {
        applyAction(lines, action);
      }

      applied.push({
        ruleId: diag.ruleId,
        line: diag.line,
        description: diag.message,
      });
    }

    // 파일 저장 (dry-run이 아닌 경우만)
    if (!options.dryRun && applied.length > 0) {
      writeFileSync(context.filePath, lines.join('\n'), 'utf-8');
    }

    return {
      file: context.filePath,
      applied,
      skipped,
    };
  }
}

function applyAction(lines: string[], action: FixAction): void {
  const lineIdx = action.line - 1;

  switch (action.type) {
    case 'remove': {
      const endIdx = (action.endLine ?? action.line) - 1;
      lines.splice(lineIdx, endIdx - lineIdx + 1);
      break;
    }
    case 'replace': {
      if (action.oldText && action.newText !== undefined) {
        lines[lineIdx] = lines[lineIdx].replace(action.oldText, action.newText);
      } else if (action.newText !== undefined) {
        lines[lineIdx] = action.newText;
      }
      break;
    }
    case 'insert': {
      if (action.newText !== undefined) {
        lines.splice(lineIdx, 0, action.newText);
      }
      break;
    }
  }
}

export function createFixer(): Fixer {
  const fixer = new Fixer();

  // fix 전략 등록은 strategies에서 import
  return fixer;
}
