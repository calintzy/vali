import { SyntaxKind, type Node } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

function getFunctionName(node: Node): string {
  if (node.getKind() === SyntaxKind.FunctionDeclaration || node.getKind() === SyntaxKind.MethodDeclaration) {
    const nameNode = node.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }
  const parent = node.getParent();
  if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
    const nameNode = parent.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }
  return '(anonymous)';
}

function isParameterReferenced(paramName: string, bodyText: string): boolean {
  // 단어 경계를 사용해 정확한 식별자 매칭
  const regex = new RegExp(`\\b${paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return regex.test(bodyText);
}

const val007: Rule = {
  id: 'VAL007',
  name: 'dead-parameter',
  description: '함수 body에서 참조되지 않는 파라미터를 감지합니다',
  severity: 'warning',
  fixable: true,

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
        const body = node.getChildrenOfKind(SyntaxKind.Block)[0];
        if (!body) continue;

        // abstract 메서드 skip
        if (node.getKind() === SyntaxKind.MethodDeclaration) {
          const modifiers = node.getChildrenOfKind(SyntaxKind.AbstractKeyword);
          if (modifiers.length > 0) continue;

          // interface 구현 메서드 skip (implements 절이 있는 클래스)
          const classDecl = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
          if (classDecl) {
            const heritage = classDecl.getChildrenOfKind(SyntaxKind.HeritageClause);
            const hasImplements = heritage.some(h =>
              h.getText().startsWith('implements')
            );
            if (hasImplements) continue;
          }
        }

        const params = node.getChildrenOfKind(SyntaxKind.Parameter);
        if (params.length === 0) continue;

        // 콜백 시그니처 패턴 skip (Express middleware 등)
        const paramNames = params.map(p => {
          const id = p.getChildrenOfKind(SyntaxKind.Identifier)[0];
          return id?.getText() ?? '';
        });
        const CALLBACK_PATTERNS = [
          ['req', 'res', 'next'],
          ['request', 'response', 'next'],
          ['err', 'req', 'res', 'next'],
          ['event', 'context'],
          ['resolve', 'reject'],
        ];
        const isCallbackSignature = CALLBACK_PATTERNS.some(pattern =>
          pattern.length === paramNames.length &&
          pattern.every((p, i) => paramNames[i] === p)
        );
        if (isCallbackSignature) continue;

        const bodyText = body.getText();
        const funcName = getFunctionName(node);

        for (let i = 0; i < params.length; i++) {
          const param = params[i];
          const paramText = param.getText();

          // 구조 분해 파라미터 skip
          if (paramText.includes('{') || paramText.includes('[')) continue;

          // 이름 추출 (타입 어노테이션 제거)
          const nameNode = param.getChildrenOfKind(SyntaxKind.Identifier)[0];
          if (!nameNode) continue;
          const paramName = nameNode.getText();

          // _ prefix 파라미터 skip
          if (paramName.startsWith('_')) continue;

          // 중간 파라미터 skip (마지막이 아닌 파라미터가 미사용이어도 시그니처 유지 필요)
          const isLastParam = i === params.length - 1;
          if (!isLastParam) continue;

          // body에서 참조 확인
          if (!isParameterReferenced(paramName, bodyText)) {
            diagnostics.push({
              ruleId: 'VAL007',
              ruleName: 'dead-parameter',
              severity: 'warning',
              message: `'${paramName}' 파라미터가 ${funcName}()에서 사용되지 않습니다 (마지막 파라미터)`,
              file: filePath,
              line: node.getStartLineNumber(),
              endLine: node.getEndLineNumber(),
              suggestion: `미사용 파라미터 '${paramName}'을(를) 제거하세요`,
            });
          }
        }
      }
    }

    return diagnostics;
  },
};

export default val007;
