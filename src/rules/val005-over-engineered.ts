import { SyntaxKind } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

interface OverEngineeredOptions {
  maxLayers: number;
}

const val005: Rule = {
  id: 'VAL005',
  name: 'over-engineered',
  description: '단순 로직에 불필요한 디자인 패턴/추상화 적용을 감지합니다',
  severity: 'warning',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath } = context;
    const diagnostics: Diagnostic[] = [];

    // === 패턴 1: 불필요한 Factory 패턴 ===
    // createXxx/makeXxx 함수가 new Xxx()만 호출
    for (const func of sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) {
      const nameNode = func.getChildrenOfKind(SyntaxKind.Identifier)[0];
      if (!nameNode) continue;
      const funcName = nameNode.getText();

      if (!/^(create|make)[A-Z]/.test(funcName)) continue;

      const body = func.getChildrenOfKind(SyntaxKind.Block)[0];
      if (!body) continue;

      const statements = body.getStatements();
      if (statements.length !== 1) continue;

      const stmtText = statements[0].getText().trim();
      // return new Xxx(...) 패턴
      if (/^return\s+new\s+\w+\(/.test(stmtText)) {
        diagnostics.push({
          ruleId: 'VAL005',
          ruleName: 'over-engineered',
          severity: 'warning',
          message: `${funcName}()는 단순히 new 호출만 수행합니다 — 불필요한 Factory 패턴`,
          file: filePath,
          line: func.getStartLineNumber(),
          endLine: func.getEndLineNumber(),
          suggestion: '직접 new를 호출하거나, Factory에 추가 로직이 필요한지 검토하세요',
        });
      }
    }

    // === 패턴 2: 과도한 pass-through 래핑 ===
    // 함수가 다른 함수를 인자 변환 없이 그대로 호출
    for (const func of sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) {
      const nameNode = func.getChildrenOfKind(SyntaxKind.Identifier)[0];
      if (!nameNode) continue;
      const funcName = nameNode.getText();

      // Factory 패턴과 중복 방지
      if (/^(create|make)[A-Z]/.test(funcName)) continue;

      const body = func.getChildrenOfKind(SyntaxKind.Block)[0];
      if (!body) continue;

      const statements = body.getStatements();
      if (statements.length !== 1) continue;

      const params = func.getChildrenOfKind(SyntaxKind.Parameter);
      if (params.length === 0) continue;

      const stmtText = statements[0].getText().trim();
      // return someFunc(param1, param2, ...) — 동일 인자 전달
      if (stmtText.startsWith('return ') && !stmtText.includes('new ')) {
        const paramNames = params.map(p => {
          const id = p.getChildrenOfKind(SyntaxKind.Identifier)[0];
          return id?.getText() ?? '';
        }).filter(Boolean);

        if (paramNames.length > 0) {
          const expectedArgs = paramNames.join(', ');
          // return func(a, b, c) 와 동일 인자인지 체크
          if (stmtText.includes(`(${expectedArgs})`)) {
            diagnostics.push({
              ruleId: 'VAL005',
              ruleName: 'over-engineered',
              severity: 'warning',
              message: `${funcName}()는 인자를 변환 없이 그대로 전달합니다 — 과도한 래핑`,
              file: filePath,
              line: func.getStartLineNumber(),
              endLine: func.getEndLineNumber(),
              suggestion: '래핑된 함수를 직접 호출하거나, 추가 로직이 필요한지 검토하세요',
            });
          }
        }
      }
    }

    // === 패턴 3: 구현체가 1개뿐인 인터페이스 ===
    const interfaces = sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration);
    const fullText = sourceFile.getFullText();

    for (const iface of interfaces) {
      const ifaceName = iface.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText();
      if (!ifaceName) continue;

      // export된 인터페이스는 skip (외부에서 사용 가능)
      if (iface.getText().startsWith('export ')) continue;

      // 파일 내에서 implements 횟수 확인
      const implementsRegex = new RegExp(`implements\\s+.*\\b${ifaceName}\\b`, 'g');
      const matches = fullText.match(implementsRegex);

      if (matches && matches.length === 1) {
        diagnostics.push({
          ruleId: 'VAL005',
          ruleName: 'over-engineered',
          severity: 'warning',
          message: `인터페이스 '${ifaceName}'의 구현체가 1개뿐입니다`,
          file: filePath,
          line: iface.getStartLineNumber(),
          endLine: iface.getEndLineNumber(),
          suggestion: '구현체가 1개인 인터페이스는 불필요할 수 있습니다. 직접 클래스를 사용하세요',
        });
      }
    }

    // === 패턴 4: 불필요한 Strategy 패턴 ===
    // Strategy/Handler/Policy 접미사 인터페이스 + 구현체 2개 이하
    for (const iface of interfaces) {
      const ifaceName = iface.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText();
      if (!ifaceName) continue;

      if (!/Strategy|Handler|Policy$/.test(ifaceName)) continue;
      if (iface.getText().startsWith('export ')) continue;

      const implementsRegex = new RegExp(`implements\\s+.*\\b${ifaceName}\\b`, 'g');
      const matches = fullText.match(implementsRegex);
      const implCount = matches ? matches.length : 0;

      if (implCount <= 2) {
        diagnostics.push({
          ruleId: 'VAL005',
          ruleName: 'over-engineered',
          severity: 'warning',
          message: `Strategy '${ifaceName}'의 구현체가 ${implCount}개뿐입니다 — 불필요한 Strategy 패턴`,
          file: filePath,
          line: iface.getStartLineNumber(),
          endLine: iface.getEndLineNumber(),
          suggestion: '구현체가 적은 Strategy는 직접 분기 로직으로 대체 가능합니다',
        });
      }
    }

    return diagnostics;
  },
};

export default val005;
