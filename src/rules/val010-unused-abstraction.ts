import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { SyntaxKind } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

interface UnusedAbstractionOptions {
  minSize: number;
}

const val010: Rule = {
  id: 'VAL010',
  name: 'unused-abstraction',
  description: '프로젝트 내 1회만 사용되는 interface/abstract class/type alias를 감지합니다',
  severity: 'info',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath, fileContent } = context;
    const options = context.config.options as Partial<UnusedAbstractionOptions>;
    const minSize = options.minSize ?? 3;
    const diagnostics: Diagnostic[] = [];

    // d.ts 파일 skip
    if (filePath.endsWith('.d.ts')) return [];

    // === 인터페이스 검사 ===
    for (const iface of sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration)) {
      const nameNode = iface.getChildrenOfKind(SyntaxKind.Identifier)[0];
      if (!nameNode) continue;
      const name = nameNode.getText();

      // export된 타입은 cross-file 참조 검사
      if (iface.getText().startsWith('export ')) {
        const crossRefs = countCrossFileReferences(name, context.projectRoot, filePath);
        if (crossRefs > 0) continue;
        const localRefs = countReferences(name, fileContent) - 1;
        if (localRefs + crossRefs <= 1) {
          diagnostics.push({
            ruleId: 'VAL010',
            ruleName: 'unused-abstraction',
            severity: 'info',
            message: `export된 인터페이스 '${name}'이(가) 프로젝트에서 거의 사용되지 않습니다 (참조: ${localRefs}회)`,
            file: filePath,
            line: iface.getStartLineNumber(),
            endLine: iface.getEndLineNumber(),
            suggestion: 'export를 제거하거나 인라인 타입으로 전환을 고려하세요',
          });
        }
        continue;
      }

      // 제네릭 utility type skip
      if (isGenericUtility(iface)) continue;

      // 크기가 minSize 미만이면 skip
      const lineCount = iface.getEndLineNumber() - iface.getStartLineNumber() + 1;
      if (lineCount < minSize) continue;

      // 파일 내 참조 횟수 (선언 자체 제외)
      const refCount = countReferences(name, fileContent) - 1;

      if (refCount <= 1) {
        diagnostics.push({
          ruleId: 'VAL010',
          ruleName: 'unused-abstraction',
          severity: 'info',
          message: `인터페이스 '${name}'이(가) ${refCount === 0 ? '사용되지 않습니다' : '1회만 참조됩니다'}`,
          file: filePath,
          line: iface.getStartLineNumber(),
          endLine: iface.getEndLineNumber(),
          suggestion: '추상화가 필요한지 검토하세요. 직접 타입을 인라인하는 것이 더 명확할 수 있습니다',
        });
      }
    }

    // === 타입 별칭 검사 ===
    for (const typeAlias of sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration)) {
      const nameNode = typeAlias.getChildrenOfKind(SyntaxKind.Identifier)[0];
      if (!nameNode) continue;
      const name = nameNode.getText();

      // export된 타입은 cross-file 참조 검사
      if (typeAlias.getText().startsWith('export ')) {
        const crossRefs = countCrossFileReferences(name, context.projectRoot, filePath);
        if (crossRefs > 0) continue;
        const localRefs = countReferences(name, fileContent) - 1;
        if (localRefs + crossRefs <= 1) {
          diagnostics.push({
            ruleId: 'VAL010',
            ruleName: 'unused-abstraction',
            severity: 'info',
            message: `export된 타입 별칭 '${name}'이(가) 프로젝트에서 거의 사용되지 않습니다 (참조: ${localRefs}회)`,
            file: filePath,
            line: typeAlias.getStartLineNumber(),
            endLine: typeAlias.getEndLineNumber(),
            suggestion: 'export를 제거하거나 인라인 타입으로 전환을 고려하세요',
          });
        }
        continue;
      }

      // 제네릭 utility type skip
      if (isGenericUtility(typeAlias)) continue;

      // 크기가 minSize 미만이면 skip
      const lineCount = typeAlias.getEndLineNumber() - typeAlias.getStartLineNumber() + 1;
      if (lineCount < minSize) continue;

      const refCount = countReferences(name, fileContent) - 1;

      if (refCount <= 1) {
        diagnostics.push({
          ruleId: 'VAL010',
          ruleName: 'unused-abstraction',
          severity: 'info',
          message: `타입 별칭 '${name}'이(가) ${refCount === 0 ? '사용되지 않습니다' : '1회만 참조됩니다'}`,
          file: filePath,
          line: typeAlias.getStartLineNumber(),
          endLine: typeAlias.getEndLineNumber(),
          suggestion: '타입을 인라인하거나, 여러 곳에서 재사용되는지 확인하세요',
        });
      }
    }

    // === abstract class 검사 ===
    for (const classDecl of sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration)) {
      const hasAbstract = classDecl.getChildrenOfKind(SyntaxKind.AbstractKeyword).length > 0;
      if (!hasAbstract) continue;

      const nameNode = classDecl.getChildrenOfKind(SyntaxKind.Identifier)[0];
      if (!nameNode) continue;
      const name = nameNode.getText();

      if (classDecl.getText().startsWith('export ')) {
        const crossRefs = countCrossFileReferences(name, context.projectRoot, filePath);
        if (crossRefs > 0) continue;
        const localRefs = countReferences(name, fileContent) - 1;
        if (localRefs + crossRefs <= 1) {
          diagnostics.push({
            ruleId: 'VAL010',
            ruleName: 'unused-abstraction',
            severity: 'info',
            message: `export된 추상 클래스 '${name}'이(가) 프로젝트에서 거의 사용되지 않습니다 (참조: ${localRefs}회)`,
            file: filePath,
            line: classDecl.getStartLineNumber(),
            endLine: classDecl.getEndLineNumber(),
            suggestion: 'export를 제거하거나 구현체를 추가하세요',
          });
        }
        continue;
      }

      const lineCount = classDecl.getEndLineNumber() - classDecl.getStartLineNumber() + 1;
      if (lineCount < minSize) continue;

      const refCount = countReferences(name, fileContent) - 1;
      if (refCount <= 1) {
        diagnostics.push({
          ruleId: 'VAL010',
          ruleName: 'unused-abstraction',
          severity: 'info',
          message: `추상 클래스 '${name}'이(가) ${refCount === 0 ? '사용되지 않습니다' : '1회만 참조됩니다'}`,
          file: filePath,
          line: classDecl.getStartLineNumber(),
          endLine: classDecl.getEndLineNumber(),
          suggestion: '구현체가 없거나 1개뿐인 추상 클래스는 제거를 고려하세요',
        });
      }
    }

    return diagnostics;
  },
};

function isGenericUtility(node: any): boolean {
  const typeParams = node.getChildrenOfKind(SyntaxKind.TypeParameter);
  return typeParams.length > 0;
}

function countReferences(name: string, content: string): number {
  const regex = new RegExp(`\\b${name}\\b`, 'g');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * 프로젝트 내 다른 파일에서의 참조 횟수를 카운트합니다.
 * 성능 제한: 최대 100파일만 검색
 */
function countCrossFileReferences(
  name: string,
  projectRoot: string,
  currentFile: string,
): number {
  let count = 0;
  const MAX_FILES = 100;

  const files = fg.sync(['**/*.{ts,tsx}'], {
    cwd: projectRoot,
    absolute: true,
    ignore: ['node_modules/**', 'dist/**', '**/*.d.ts'],
  });

  const targetFiles = files
    .filter(f => f !== currentFile)
    .slice(0, MAX_FILES);

  const regex = new RegExp(`\\b${name}\\b`);

  for (const file of targetFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      if (regex.test(content)) {
        count++;
      }
    } catch {
      // 읽기 실패 무시
    }
  }

  return count;
}

export default val010;
