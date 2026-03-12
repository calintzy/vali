import { SyntaxKind } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

interface ExcessiveErrorOptions {
  allowAsync: boolean;
}

// 에러를 던지지 않는 안전한 동기 함수/메서드
const SAFE_SYNC_PATTERNS = new Set([
  'Math.', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Number', 'String', 'Boolean', 'Array.isArray',
  '.map', '.filter', '.reduce', '.forEach', '.find',
  '.some', '.every', '.includes', '.indexOf',
  '.slice', '.concat', '.join', '.split',
  '.trim', '.toLowerCase', '.toUpperCase',
  '.toString', '.valueOf',
  '.push', '.pop', '.shift', '.unshift',
  '.keys', '.values', '.entries',
]);

function hasDangerousCall(tryText: string): boolean {
  // await, throw, 파일/네트워크 I/O 등이 있으면 위험한 호출
  if (/\bawait\b/.test(tryText)) return true;
  if (/\bthrow\b/.test(tryText)) return true;
  if (/\bnew\s+\w*Error\b/.test(tryText)) return true;
  if (/\bJSON\.(parse|stringify)\b/.test(tryText)) return true;
  if (/\bfs\b/.test(tryText)) return true;
  if (/\bfetch\b/.test(tryText)) return true;
  if (/\brequire\b/.test(tryText)) return true;
  if (/\bimport\b/.test(tryText)) return true;
  if (/\bexec[a-zA-Z]*\b/.test(tryText)) return true;

  return false;
}

const val008: Rule = {
  id: 'VAL008',
  name: 'excessive-error',
  description: '불필요한 try-catch 또는 불가능한 에러 케이스 처리를 감지합니다',
  severity: 'warning',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath } = context;
    const options = context.config.options as Partial<ExcessiveErrorOptions>;
    const allowAsync = options.allowAsync ?? true;
    const diagnostics: Diagnostic[] = [];

    const tryStatements = sourceFile.getDescendantsOfKind(SyntaxKind.TryStatement);

    for (const tryStmt of tryStatements) {
      const tryBlock = tryStmt.getChildrenOfKind(SyntaxKind.Block)[0];
      if (!tryBlock) continue;

      const catchClause = tryStmt.getChildrenOfKind(SyntaxKind.CatchClause)[0];
      if (!catchClause) continue;

      const tryText = tryBlock.getText();
      const catchBlock = catchClause.getChildrenOfKind(SyntaxKind.Block)[0];
      const line = tryStmt.getStartLineNumber();

      // async 함수 내 try-catch이고 allowAsync면 skip
      if (allowAsync && /\bawait\b/.test(tryText)) continue;

      // === 패턴 1: 동기 순수 함수만 있는 try-catch ===
      if (!hasDangerousCall(tryText)) {
        diagnostics.push({
          ruleId: 'VAL008',
          ruleName: 'excessive-error',
          severity: 'warning',
          message: 'try 블록에 에러를 발생시킬 수 있는 코드가 없습니다',
          file: filePath,
          line,
          endLine: tryStmt.getEndLineNumber(),
          suggestion: 'try-catch를 제거하고 코드를 직접 실행하세요',
        });
        continue;
      }

      // === 패턴 2: catch에서 에러를 무시 (빈 catch 또는 console.log만) ===
      if (catchBlock) {
        const catchStatements = catchBlock.getStatements();
        const catchText = catchBlock.getText()
          .replace(/^\{/, '').replace(/\}$/, '').trim();

        if (catchStatements.length === 0 && catchText.length === 0) {
          diagnostics.push({
            ruleId: 'VAL008',
            ruleName: 'excessive-error',
            severity: 'warning',
            message: 'catch 블록이 비어있습니다 — 에러가 무시됩니다',
            file: filePath,
            line: catchClause.getStartLineNumber(),
            endLine: catchClause.getEndLineNumber(),
            suggestion: '에러를 적절히 처리하거나, 의도적이면 주석으로 이유를 설명하세요',
          });
          continue;
        }

        // console.log/warn만 있는 경우
        if (catchStatements.length <= 2) {
          const allConsole = catchStatements.every(s =>
            /^\s*(console\.(log|warn|error|info))\s*\(/.test(s.getText().trim())
          );
          if (allConsole && catchStatements.length > 0) {
            diagnostics.push({
              ruleId: 'VAL008',
              ruleName: 'excessive-error',
              severity: 'warning',
              message: 'catch 블록에 console 로깅만 있습니다 — 에러가 적절히 처리되지 않습니다',
              file: filePath,
              line: catchClause.getStartLineNumber(),
              endLine: catchClause.getEndLineNumber(),
              suggestion: '에러를 re-throw하거나 사용자에게 알리는 처리를 추가하세요',
            });
          }
        }
      }

      // === 패턴 4: 타입 시스템 기반 불가능 에러 ===
      if (context.typeChecker && hasDangerousCall(tryText)) {
        const callExpressions = tryBlock.getDescendantsOfKind(SyntaxKind.CallExpression);
        let allSafe = true;

        for (const call of callExpressions) {
          try {
            const signature = context.typeChecker.getResolvedSignature(call);
            if (!signature) { allSafe = false; break; }

            const returnType = signature.getReturnType();
            if (returnType.getText().includes('never')) { allSafe = false; break; }

            const decl = signature.getDeclaration();
            if (decl) {
              const jsDocs = (decl as any).getJsDocs?.();
              if (jsDocs?.some((d: any) => d.getText().includes('@throws'))) {
                allSafe = false; break;
              }
            }
          } catch {
            allSafe = false;
            break;
          }
        }

        if (allSafe && callExpressions.length > 0) {
          diagnostics.push({
            ruleId: 'VAL008',
            ruleName: 'excessive-error',
            severity: 'warning',
            message: 'try 블록의 모든 함수 호출이 에러를 던지지 않는 타입입니다',
            file: filePath,
            line,
            endLine: tryStmt.getEndLineNumber(),
            suggestion: '타입 시스템에 따르면 이 try-catch는 불필요합니다',
          });
        }
      }

      // === 패턴 3: 중첩 try-catch ===
      const nestedTry = tryBlock.getDescendantsOfKind(SyntaxKind.TryStatement);
      if (nestedTry.length > 0) {
        diagnostics.push({
          ruleId: 'VAL008',
          ruleName: 'excessive-error',
          severity: 'warning',
          message: '중첩된 try-catch가 있습니다',
          file: filePath,
          line,
          endLine: tryStmt.getEndLineNumber(),
          suggestion: '에러 처리를 통합하거나 함수로 분리하세요',
        });
      }
    }

    return diagnostics;
  },
};

export default val008;
