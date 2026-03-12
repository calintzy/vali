import { SyntaxKind, type Node } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX)\b/i;
const NOOP_NAMES = new Set(['noop', 'nop', 'empty', 'stub']);

function isNoopPattern(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;

  // const noop = () => {}
  if (parent.getKind() === SyntaxKind.VariableDeclaration) {
    const name = parent.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText();
    if (name && NOOP_NAMES.has(name.toLowerCase())) return true;
  }

  // 콜백 인자의 빈 화살표 함수: .then(() => {})
  if (parent.getKind() === SyntaxKind.CallExpression) return true;

  // 이벤트 핸들러 인자
  if (parent.getKind() === SyntaxKind.PropertyAssignment) {
    const propName = parent.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText() ?? '';
    if (propName.startsWith('on')) return true;
  }

  return false;
}

function getFunctionName(node: Node): string {
  // FunctionDeclaration
  if (node.getKind() === SyntaxKind.FunctionDeclaration) {
    const nameNode = node.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }

  // MethodDeclaration
  if (node.getKind() === SyntaxKind.MethodDeclaration) {
    const nameNode = node.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }

  // VariableDeclaration의 ArrowFunction
  const parent = node.getParent();
  if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
    const nameNode = parent.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }

  return '(anonymous)';
}

function hasOnlyTodoComments(bodyText: string): boolean {
  const lines = bodyText
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return false;

  return lines.every(line =>
    line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')
  ) && lines.some(line => TODO_PATTERN.test(line));
}

const val003: Rule = {
  id: 'VAL003',
  name: 'empty-function',
  description: '구현 없는 함수(빈 body 또는 TODO만 있음)를 감지합니다',
  severity: 'warning',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath } = context;
    const diagnostics: Diagnostic[] = [];

    const functionKinds = [
      SyntaxKind.FunctionDeclaration,
      SyntaxKind.MethodDeclaration,
      SyntaxKind.ArrowFunction,
      SyntaxKind.FunctionExpression,
    ];

    for (const kind of functionKinds) {
      for (const node of sourceFile.getDescendantsOfKind(kind)) {
        // abstract 메서드 skip
        if (node.getKind() === SyntaxKind.MethodDeclaration) {
          const text = node.getText();
          if (text.includes('abstract ')) continue;
        }

        const body = node.getChildrenOfKind(SyntaxKind.Block)[0];
        if (!body) continue;

        const statements = body.getStatements();
        const bodyText = body.getText();
        const funcName = getFunctionName(node);
        const line = node.getStartLineNumber();

        // 빈 body
        if (statements.length === 0) {
          if (isNoopPattern(node)) continue;

          // body 내부에 TODO 주석만 있는 경우
          if (hasOnlyTodoComments(bodyText)) {
            diagnostics.push({
              ruleId: 'VAL003',
              ruleName: 'empty-function',
              severity: 'warning',
              message: `${funcName}()에 TODO 주석만 있고 구현이 없습니다`,
              file: filePath,
              line,
              endLine: node.getEndLineNumber(),
              suggestion: '함수를 구현하거나, 불필요하면 삭제하세요',
            });
          } else {
            diagnostics.push({
              ruleId: 'VAL003',
              ruleName: 'empty-function',
              severity: 'warning',
              message: `${funcName}()의 body가 비어있습니다`,
              file: filePath,
              line,
              endLine: node.getEndLineNumber(),
              suggestion: '함수를 구현하거나, 불필요하면 삭제하세요',
            });
          }
        }
      }
    }

    return diagnostics;
  },
};

export default val003;
