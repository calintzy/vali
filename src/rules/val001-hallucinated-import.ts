import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { builtinModules } from 'node:module';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';
import { SyntaxKind } from 'ts-morph';

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
]);

function getPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

function isRelativePath(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function checkRelativeImport(specifier: string, filePath: string): boolean {
  const dir = dirname(filePath);
  const resolved = resolve(dir, specifier);

  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  return extensions.some(ext => existsSync(resolved + ext));
}

function checkPackageImport(specifier: string, projectRoot: string): boolean {
  const packageName = getPackageName(specifier);

  if (NODE_BUILTINS.has(packageName)) return true;

  // package.json의 dependencies 확인
  try {
    const pkgPath = resolve(projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(
        readFileSync(pkgPath, 'utf-8')
      );
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      if (packageName in allDeps) return true;
    }
  } catch {
    // package.json 읽기 실패 시 node_modules로 폴백
  }

  // node_modules 직접 확인
  const modulePath = resolve(projectRoot, 'node_modules', packageName);
  return existsSync(modulePath);
}

const val001: Rule = {
  id: 'VAL001',
  name: 'hallucinated-import',
  description: '존재하지 않는 패키지/모듈을 import하는 코드를 감지합니다',
  severity: 'error',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath, projectRoot } = context;
    const diagnostics: Diagnostic[] = [];

    // import 선언 검사
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      const line = importDecl.getStartLineNumber();

      if (isRelativePath(specifier)) {
        if (!checkRelativeImport(specifier, filePath)) {
          diagnostics.push({
            ruleId: 'VAL001',
            ruleName: 'hallucinated-import',
            severity: 'error',
            message: `'${specifier}' 파일이 존재하지 않습니다`,
            file: filePath,
            line,
            suggestion: `파일 경로를 확인하세요: ${specifier}`,
          });
        }
      } else {
        if (!checkPackageImport(specifier, projectRoot)) {
          const pkgName = getPackageName(specifier);
          diagnostics.push({
            ruleId: 'VAL001',
            ruleName: 'hallucinated-import',
            severity: 'error',
            message: `'${specifier}' 패키지가 존재하지 않습니다`,
            file: filePath,
            line,
            suggestion: `패키지 설치: npm install ${pkgName}`,
          });
        }
      }
    }

    // require() 호출 검사
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = callExpr.getExpression();
      if (expr.getText() !== 'require') continue;

      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      const firstArg = args[0];
      if (firstArg.getKind() !== SyntaxKind.StringLiteral) continue;

      const specifier = firstArg.getText().slice(1, -1); // 따옴표 제거
      const line = callExpr.getStartLineNumber();

      if (isRelativePath(specifier)) {
        if (!checkRelativeImport(specifier, filePath)) {
          diagnostics.push({
            ruleId: 'VAL001',
            ruleName: 'hallucinated-import',
            severity: 'error',
            message: `'${specifier}' 파일이 존재하지 않습니다`,
            file: filePath,
            line,
            suggestion: `파일 경로를 확인하세요: ${specifier}`,
          });
        }
      } else if (!checkPackageImport(specifier, projectRoot)) {
        const pkgName = getPackageName(specifier);
        diagnostics.push({
          ruleId: 'VAL001',
          ruleName: 'hallucinated-import',
          severity: 'error',
          message: `'${specifier}' 패키지가 존재하지 않습니다`,
          file: filePath,
          line,
          suggestion: `패키지 설치: npm install ${pkgName}`,
        });
      }
    }

    return diagnostics;
  },
};

export default val001;
