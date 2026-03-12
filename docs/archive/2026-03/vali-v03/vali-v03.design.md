# Vali v0.3 Design Document

> **Summary**: ESLint 플러그인 어댑터, GitHub Action, SARIF 포매터, v0.2 규칙 Gap 보강의 상세 설계
>
> **Project**: Vali (Validate AI)
> **Version**: 0.3.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft
> **Planning Doc**: [vali-v03.plan.md](../../01-plan/features/vali-v03.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- **생태계 통합**: ESLint 플러그인으로 에디터 실시간 표시 + GitHub Action으로 CI 자동화
- **표준 출력**: SARIF v2.1 포맷으로 GitHub Security 탭 및 보안 도구 연동
- **규칙 완성도**: v0.2 Gap 4개 규칙의 미구현 패턴 보완으로 false positive 감소
- **하위 호환**: v0.2 CLI/API/설정 100% 하위 호환 유지

### 1.2 Design Principles

- **어댑터 패턴**: Vali Rule을 ESLint Rule로 변환하는 범용 어댑터로 규칙 추가 시 코드 변경 최소화
- **Composite Action**: Docker 불필요, Node.js만으로 빠른 CI 시작
- **최소 SARIF**: 필수 필드만 구현하여 외부 의존성 제거
- **점진적 cross-file**: VAL010 cross-file은 TypeChecker 내장 기능 활용으로 성능 영향 최소화

---

## 2. Architecture

### 2.1 확장된 Component Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         CLI Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │  check   │  │   init   │  │  rules   │  (Commander.js)     │
│  │ +fix     │  └──────────┘  └──────────┘                     │
│  │ +diff    │                                                  │
│  │ +sarif   │  ← NEW                                           │
│  └────┬─────┘                                                  │
│       │                                                        │
├───────▼────────────────────────────────────────────────────────┤
│                      Analyzer Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                │
│  │ Scanner  │─▶│  Parser  │─▶│ Rule Runner  │                │
│  │(glob+fs) │  │(ts-morph)│  │(rules 실행)   │                │
│  └──────────┘  └──────────┘  └──────┬───────┘                │
│  ┌──────────┐                       │                         │
│  │  Diff    │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤                        │
│  └──────────┘                       │                         │
├─────────────────────────────────────▼─────────────────────────┤
│                       Rules Layer (10개)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ VAL001  │ │ VAL002  │ │ VAL003  │ │ VAL004  │           │
│  │         │ │         │ │         │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ VAL005  │ │ VAL006  │ │ VAL007  │ │ VAL008  │           │
│  │+strategy│ │         │ │+iface   │ │+imposs. │           │
│  │ PATCH   │ │         │ │ PATCH   │ │ PATCH   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐                                    │
│  │ VAL009  │ │ VAL010  │                                    │
│  │         │ │+abstract│                                    │
│  │         │ │+xfile   │                                    │
│  │         │ │ PATCH   │                                    │
│  └─────────┘ └─────────┘                                    │
├───────────────────────────────────────────────────────────────┤
│                      Fixer Layer                              │
│  ┌──────────────┐  ┌──────────────────────────────┐          │
│  │  Fixer       │  │  Fix Strategies (3개)        │          │
│  │  Engine      │──│  fix-dead-param / boiler /    │          │
│  │              │  │  empty-function               │          │
│  └──────────────┘  └──────────────────────────────┘          │
├───────────────────────────────────────────────────────────────┤
│                      Output Layer                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Terminal     │ │    JSON      │ │   SARIF      │ ← NEW  │
│  │  Formatter    │ │  Formatter   │ │  Formatter   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│  ┌──────────────┐                                            │
│  │   Scorer     │                                            │
│  └──────────────┘                                            │
├───────────────────────────────────────────────────────────────┤
│              ESLint Plugin (NEW, 별도 패키지)                  │
│  ┌──────────────────────────────────────┐                    │
│  │  eslint-plugin-vali                  │                    │
│  │  ┌────────────────────────────┐      │                    │
│  │  │  adapter.ts                │      │                    │
│  │  │  createESLintRule(valiRule) │      │                    │
│  │  └────────────────────────────┘      │                    │
│  │  ┌────────────────────────────┐      │                    │
│  │  │  configs/recommended.ts    │      │                    │
│  │  └────────────────────────────┘      │                    │
│  └──────────────────────────────────────┘                    │
├───────────────────────────────────────────────────────────────┤
│              GitHub Action (NEW)                              │
│  ┌──────────────────────────────────────┐                    │
│  │  vali-action (composite)             │                    │
│  │  ┌────────────────────────────┐      │                    │
│  │  │  main.ts → vali check      │      │                    │
│  │  │  comment.ts → PR comment   │      │                    │
│  │  └────────────────────────────┘      │                    │
│  └──────────────────────────────────────┘                    │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Type Definitions

### 3.1 CheckOptions 확장

```typescript
// src/types/index.ts — CheckOptions에 sarif 포맷 추가
export interface CheckOptions {
  format: 'terminal' | 'json' | 'sarif';  // 'sarif' 추가
  ci: boolean;
  score: boolean;
  config: string;
  quiet: boolean;
  fix?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  diffBase?: string;
}
```

### 3.2 SARIF 타입 (최소 스키마)

```typescript
// src/cli/formatters/sarif.ts 내부 타입
interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRuleDescriptor[];
    };
  };
  results: SarifResult[];
}

interface SarifRuleDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: {
      startLine: number;
      endLine?: number;
      startColumn?: number;
    };
  };
}
```

---

## 4. Rule Gap Patches (v0.2 미구현 패턴)

### 4.1 VAL005: unnecessaryStrategy 패턴 추가

**현재**: 3/4 패턴 (Factory, pass-through, single-impl)
**추가**: `unnecessaryStrategy` — Strategy interface + 구현체 2개 이하

```typescript
// src/rules/val005-over-engineered.ts에 추가

// === 패턴 4: 불필요한 Strategy 패턴 ===
// interface XxxStrategy + 구현체가 2개 이하
for (const iface of interfaces) {
  const ifaceName = iface.getChildrenOfKind(SyntaxKind.Identifier)[0]?.getText();
  if (!ifaceName) continue;

  // Strategy/Handler/Policy 접미사 패턴
  if (!/Strategy|Handler|Policy$/.test(ifaceName)) continue;

  // export된 인터페이스는 skip
  if (iface.getText().startsWith('export ')) continue;

  // 파일 내 implements 횟수
  const fullText = sourceFile.getFullText();
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
```

### 4.2 VAL007: interface/callback skip 강화

**현재**: abstract 메서드 skip, 마지막 파라미터만 검사
**추가**: (1) implements 키워드가 있는 클래스의 메서드 skip, (2) 콜백 시그니처 패턴 skip

```typescript
// src/rules/val007-dead-parameter.ts에 추가

// === interface 구현 메서드 skip ===
if (node.getKind() === SyntaxKind.MethodDeclaration) {
  // 부모 클래스가 implements 절을 가지는지 확인
  const classDecl = node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
  if (classDecl) {
    const heritage = classDecl.getChildrenOfKind(SyntaxKind.HeritageClause);
    const hasImplements = heritage.some(h =>
      h.getText().startsWith('implements')
    );
    if (hasImplements) continue;
  }
}

// === 콜백 시그니처 패턴 skip ===
// (req, res, next) 패턴: Express middleware 등
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
```

### 4.3 VAL008: impossibleError 패턴 추가

**현재**: 4/5 패턴 (syncPure, emptyCatch, consoleOnly, nestedTry)
**추가**: `impossibleError` — TypeChecker 기반, 에러를 던질 수 없는 함수의 try-catch

```typescript
// src/rules/val008-excessive-error.ts에 추가

// === 패턴 4: 타입 시스템 기반 불가능 에러 ===
// try 블록 내 모든 호출이 never를 throw하지 않는 타입일 때
if (context.typeChecker && hasDangerousCall(tryText)) {
  const callExpressions = tryBlock.getDescendantsOfKind(SyntaxKind.CallExpression);
  let allSafe = true;

  for (const call of callExpressions) {
    try {
      const signature = context.typeChecker.getResolvedSignature(call);
      if (!signature) { allSafe = false; break; }

      // 반환 타입에 never가 포함되어 있으면 throw 가능
      const returnType = signature.getReturnType();
      if (returnType.getText().includes('never')) { allSafe = false; break; }

      // throws 어노테이션이 있으면 throw 가능 (TSDoc @throws)
      const decl = signature.getDeclaration();
      if (decl) {
        const jsDocs = decl.getJsDocs?.();
        if (jsDocs?.some(d => d.getText().includes('@throws'))) {
          allSafe = false; break;
        }
      }
    } catch {
      // TypeChecker 실패 시 안전하지 않다고 가정 → skip
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
```

**주의**: TypeChecker가 없으면 이 패턴은 skip됨 (false positive 방지).

### 4.4 VAL010: abstract class + generic utility skip + cross-file reference

**현재**: interface + type alias, 파일 내 참조
**추가**: (1) abstract class 감지, (2) 제네릭 utility type skip, (3) cross-file 참조

```typescript
// src/rules/val010-unused-abstraction.ts에 추가

// === abstract class 검사 ===
for (const classDecl of sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration)) {
  // abstract가 아닌 클래스는 skip
  const hasAbstract = classDecl.getChildrenOfKind(SyntaxKind.AbstractKeyword).length > 0;
  if (!hasAbstract) continue;

  const nameNode = classDecl.getChildrenOfKind(SyntaxKind.Identifier)[0];
  if (!nameNode) continue;
  const name = nameNode.getText();

  if (classDecl.getText().startsWith('export ')) continue;

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

// === 제네릭 utility type skip ===
// 제네릭 타입 파라미터가 있는 타입은 유틸리티 목적일 가능성이 높으므로 skip
function isGenericUtility(node: Node): boolean {
  const typeParams = node.getChildrenOfKind(SyntaxKind.TypeParameter);
  return typeParams.length > 0;
}

// interface/type alias 검사 시 조건 추가:
// if (isGenericUtility(iface)) continue;
// if (isGenericUtility(typeAlias)) continue;

// === cross-file 참조 (TypeChecker 사용 시) ===
// export된 타입도 프로젝트 전체에서 1회 이하 참조 시 감지
function countCrossFileReferences(
  name: string,
  node: Node,
  typeChecker: TypeChecker | undefined
): number | null {
  if (!typeChecker) return null;  // TypeChecker 없으면 cross-file 불가

  try {
    const refs = node.findReferencesAsNodes();
    // 선언 자체 제외
    return refs.length - 1;
  } catch {
    return null;  // 실패 시 null 반환 → 기존 파일 내 검사로 fallback
  }
}

// export된 타입에 대해 cross-file 검사 적용:
// const crossFileCount = countCrossFileReferences(name, iface, context.typeChecker);
// if (crossFileCount !== null && crossFileCount <= 1) { ... }
// if (crossFileCount === null && iface.getText().startsWith('export ')) continue; // 기존 동작
```

---

## 5. SARIF Formatter

### 5.1 SARIF v2.1 포매터

```typescript
// src/cli/formatters/sarif.ts

import type { ScanResult, Diagnostic, Severity } from '../../types/index.js';
import { rules } from '../../rules/index.js';

function severityToLevel(severity: Severity): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'note';
  }
}

export function formatSarif(result: ScanResult, projectRoot: string): string {
  const sarifLog: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'vali',
          version: '0.3.0',
          informationUri: 'https://github.com/user/vali',
          rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            shortDescription: { text: r.description },
            defaultConfiguration: { level: severityToLevel(r.severity) },
          })),
        },
      },
      results: result.files.flatMap(f =>
        f.diagnostics.map(d => diagnosticToSarifResult(d, projectRoot))
      ),
    }],
  };

  return JSON.stringify(sarifLog, null, 2);
}

function diagnosticToSarifResult(d: Diagnostic, projectRoot: string): SarifResult {
  const relativePath = d.file.startsWith(projectRoot)
    ? d.file.slice(projectRoot.length + 1)
    : d.file;

  return {
    ruleId: d.ruleId,
    level: severityToLevel(d.severity),
    message: { text: d.suggestion ? `${d.message}. ${d.suggestion}` : d.message },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: relativePath },
        region: {
          startLine: d.line,
          endLine: d.endLine,
          startColumn: d.column,
        },
      },
    }],
  };
}
```

### 5.2 CLI 옵션 추가

```typescript
// src/cli/index.ts — --format에 sarif 추가
.option('--format <type>', '출력 형식 (terminal, json, sarif)', 'terminal')

// src/cli/commands/check.ts — sarif 분기 추가
case 'sarif':
  output = formatSarif(scanResult, projectRoot);
  break;
```

---

## 6. ESLint Plugin

### 6.1 패키지 구조

```
packages/eslint-plugin-vali/
├── src/
│   ├── index.ts            # 플러그인 진입점
│   ├── adapter.ts           # Vali Rule → ESLint Rule 어댑터
│   └── configs/
│       └── recommended.ts   # recommended preset
├── tests/
│   └── adapter.test.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### 6.2 어댑터 설계

```typescript
// packages/eslint-plugin-vali/src/adapter.ts

import { Project, type SourceFile } from 'ts-morph';
import type { Rule as ValiRule, ResolvedRuleConfig } from 'vali';

// ts-morph Project 캐싱 (ESLint 세션 내 재사용)
let cachedProject: Project | null = null;

function getProject(): Project {
  if (!cachedProject) {
    cachedProject = new Project({
      compilerOptions: { allowJs: true, checkJs: false },
      skipAddingFilesFromTsConfig: true,
    });
  }
  return cachedProject;
}

export function createESLintRule(valiRule: ValiRule) {
  return {
    meta: {
      type: 'suggestion' as const,
      docs: {
        description: valiRule.description,
        recommended: true,
      },
      fixable: valiRule.fixable ? ('code' as const) : undefined,
      schema: [],  // 규칙별 옵션은 .valirc.json에서 관리
      messages: {
        [valiRule.id]: '{{ message }}',
      },
    },

    create(context: any) {
      return {
        Program(node: any) {
          const filename = context.getFilename();
          const sourceCode = context.getSourceCode().getText();

          const project = getProject();
          let sourceFile: SourceFile;

          try {
            sourceFile = project.createSourceFile(
              `__eslint_${Date.now()}.ts`,
              sourceCode,
              { overwrite: true }
            );
          } catch {
            return;  // 파싱 실패 시 skip
          }

          const config: ResolvedRuleConfig = {
            enabled: true,
            severity: valiRule.severity,
            options: {},
          };

          try {
            const diagnostics = valiRule.check({
              sourceFile,
              filePath: filename,
              fileContent: sourceCode,
              config,
              projectRoot: process.cwd(),
            });

            for (const d of diagnostics) {
              context.report({
                node,
                loc: {
                  start: { line: d.line, column: 0 },
                  end: { line: d.endLine ?? d.line, column: 0 },
                },
                messageId: valiRule.id,
                data: { message: d.message },
              });
            }
          } finally {
            project.removeSourceFile(sourceFile);
          }
        },
      };
    },
  };
}
```

### 6.3 플러그인 진입점

```typescript
// packages/eslint-plugin-vali/src/index.ts

import { rules as valiRules } from 'vali';
import { createESLintRule } from './adapter.js';
import recommended from './configs/recommended.js';

// Vali 규칙을 ESLint 규칙으로 변환
const eslintRules: Record<string, any> = {};
for (const rule of valiRules) {
  eslintRules[rule.name] = createESLintRule(rule);
}

// ESLint v9 flat config 플러그인 객체
const plugin = {
  meta: {
    name: 'eslint-plugin-vali',
    version: '0.3.0',
  },
  rules: eslintRules,
  configs: {},
};

// recommended config (flat config용)
plugin.configs.recommended = {
  plugins: { vali: plugin },
  rules: Object.fromEntries(
    valiRules.map(r => [`vali/${r.name}`, r.severity === 'error' ? 'error' : 'warn'])
  ),
};

export default plugin;
```

### 6.4 recommended config

```typescript
// packages/eslint-plugin-vali/src/configs/recommended.ts

// flat config에서 직접 import하여 사용:
// import vali from 'eslint-plugin-vali';
// export default [vali.configs.recommended];

// legacy config (.eslintrc)에서는:
// { "plugins": ["vali"], "extends": ["plugin:vali/recommended"] }
```

### 6.5 package.json

```json
{
  "name": "eslint-plugin-vali",
  "version": "0.3.0",
  "description": "ESLint plugin for Vali AI code quality rules",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "eslint": ">=8.0.0"
  },
  "dependencies": {
    "vali": "^0.3.0"
  }
}
```

---

## 7. GitHub Action

### 7.1 action.yml

```yaml
# action/action.yml
name: 'Vali - AI Code Quality Check'
description: 'AI 생성 코드의 환각, 슬롭, 과잉설계를 자동 감지'
inputs:
  path:
    description: '검사할 디렉토리 경로'
    required: false
    default: 'src/'
  format:
    description: '출력 형식 (terminal, json, sarif)'
    required: false
    default: 'terminal'
  fix:
    description: '자동 수정 적용 여부'
    required: false
    default: 'false'
  diff:
    description: 'git diff 기준 변경 파일만 검사'
    required: false
    default: 'false'
  comment:
    description: 'PR에 결과 코멘트 게시 여부'
    required: false
    default: 'true'
  token:
    description: 'GitHub token (PR 코멘트에 필요)'
    required: false
    default: '${{ github.token }}'
outputs:
  score:
    description: 'AI Slop Score (0-100)'
  error-count:
    description: 'Error 개수'
  warning-count:
    description: 'Warning 개수'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 7.2 Action main.ts

```typescript
// action/src/main.ts

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { postComment } from './comment.js';

async function run(): Promise<void> {
  const path = core.getInput('path');
  const format = core.getInput('format');
  const fix = core.getBooleanInput('fix');
  const diff = core.getBooleanInput('diff');
  const comment = core.getBooleanInput('comment');

  // vali check 실행
  let stdout = '';
  const args = ['vali', 'check', path, '--format', 'json'];
  if (diff) args.push('--diff');

  const exitCode = await exec.exec('npx', args, {
    listeners: { stdout: (data) => { stdout += data.toString(); } },
    ignoreReturnCode: true,
  });

  const result = JSON.parse(stdout);

  // outputs 설정
  core.setOutput('score', result.score.score);
  core.setOutput('error-count', result.summary.errorCount);
  core.setOutput('warning-count', result.summary.warningCount);

  // PR 코멘트 게시
  if (comment && process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const token = core.getInput('token');
    await postComment(result, token);
  }

  // SARIF 업로드용
  if (format === 'sarif') {
    const sarifArgs = ['vali', 'check', path, '--format', 'sarif'];
    if (diff) sarifArgs.push('--diff');
    await exec.exec('npx', sarifArgs, {
      listeners: {
        stdout: (data) => {
          const fs = require('fs');
          fs.writeFileSync('vali-results.sarif', data.toString());
        },
      },
      ignoreReturnCode: true,
    });
    core.setOutput('sarif-file', 'vali-results.sarif');
  }

  // error가 있으면 action 실패
  if (result.summary.errorCount > 0) {
    core.setFailed(`Vali found ${result.summary.errorCount} error(s)`);
  }
}

run().catch(err => core.setFailed(err.message));
```

### 7.3 PR 코멘트 (comment.ts)

```typescript
// action/src/comment.ts

import * as github from '@actions/github';
import type { ScanResult } from 'vali';

export async function postComment(result: ScanResult, token: string): Promise<void> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const prNumber = github.context.payload.pull_request?.number;
  if (!prNumber) return;

  const { summary, score } = result;
  const gradeEmoji = {
    clean: '✅', low: '🟢', moderate: '🟡', high: '🟠', critical: '🔴',
  };

  const body = `## Vali AI Code Quality Report

${gradeEmoji[score.grade]} **AI Slop Score: ${score.score}/100** (${score.grade})

| Metric | Count |
|--------|-------|
| Files Scanned | ${summary.totalFiles} |
| Errors | ${summary.errorCount} |
| Warnings | ${summary.warningCount} |
| Info | ${summary.infoCount} |

${result.files
  .filter(f => f.diagnostics.length > 0)
  .slice(0, 10)  // 최대 10개 파일만 표시
  .map(f => `### \`${f.file}\`\n${f.diagnostics.map(d =>
    `- ${d.severity === 'error' ? '⛔' : d.severity === 'warning' ? '⚠️' : '💬'} L${d.line}: **${d.ruleName}** — ${d.message}`
  ).join('\n')}`)
  .join('\n\n')}

---
*Generated by [Vali](https://github.com/user/vali) v0.3.0*`;

  // 기존 vali 코멘트 검색 후 업데이트 또는 새 코멘트
  const { data: comments } = await octokit.rest.issues.listComments({
    owner, repo, issue_number: prNumber,
  });
  const existing = comments.find(c => c.body?.includes('Vali AI Code Quality Report'));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner, repo, comment_id: existing.id, body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner, repo, issue_number: prNumber, body,
    });
  }
}
```

---

## 8. Test Strategy

### 8.1 새 테스트 파일

| Test File | Target | Cases |
|-----------|--------|:-----:|
| `tests/fixer.test.ts` | Fixer 엔진 독립 테스트 | 5+ |
| `tests/diff.test.ts` | Diff 모듈 독립 테스트 | 3+ |
| `tests/formatters/sarif.test.ts` | SARIF 포매터 | 4+ |
| `packages/eslint-plugin-vali/tests/adapter.test.ts` | ESLint 어댑터 | 5+ |
| `tests/benchmarks/scan.bench.ts` | 성능 벤치마크 | 2+ |

### 8.2 규칙 테스트 추가

| Rule | 추가 테스트 | 추가 Fixture |
|------|-----------|-------------|
| VAL005 | unnecessaryStrategy 패턴 감지 | `fixtures/over-engineered/unnecessary-strategy.ts` |
| VAL007 | implements skip, callback skip | `fixtures/dead-parameter/implements-method.ts` |
| VAL008 | impossibleError 패턴 감지 | `fixtures/excessive-error/impossible-error.ts` |
| VAL010 | abstract class, generic skip | `fixtures/unused-abstraction/abstract-class.ts` |

### 8.3 누락 Fixture 추가

| Fixture | 목적 |
|---------|------|
| `fixtures/hallucinated-api/any-type.ts` | any 타입 skip 테스트 |
| `fixtures/over-engineered/single-impl.ts` | 단일 구현체 인터페이스 |
| `fixtures/excessive-error/empty-catch.ts` | 빈 catch 블록 |

---

## 9. npm Workspaces 설정

```json
// package.json (루트)
{
  "workspaces": [
    "packages/*"
  ]
}
```

---

## 10. Implementation Order

```
Phase 1: v0.2 Gap 해소 (규칙 패치)
  1. VAL005 unnecessaryStrategy 추가 + 테스트
  2. VAL007 implements/callback skip + 테스트
  3. VAL008 impossibleError 추가 + 테스트
  4. VAL010 abstract class + generic skip + cross-file + 테스트
  5. 3개 누락 fixture 추가
  6. Fixer/Diff 독립 테스트

Phase 2: SARIF 포매터
  7. src/cli/formatters/sarif.ts 구현
  8. CheckOptions.format에 'sarif' 추가
  9. CLI --format sarif 연결 + SARIF 테스트

Phase 3: ESLint 플러그인
  10. packages/eslint-plugin-vali/ 구조 설정
  11. adapter.ts (createESLintRule)
  12. index.ts (규칙 등록 + recommended config)
  13. package.json + tsup 빌드 설정
  14. adapter.test.ts

Phase 4: GitHub Action
  15. action/action.yml
  16. action/src/main.ts
  17. action/src/comment.ts
  18. ncc 번들 빌드

Phase 5: 품질 & 배포
  19. 성능 벤치마크 (scan.bench.ts)
  20. README.md + CHANGELOG.md
  21. npm publish 준비
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial design from v0.3 plan + v0.2 gap analysis | Ryan |
