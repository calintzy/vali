# Vali v0.4 Design Document

> **Summary**: 커스텀 규칙 API 공개, npm 배포 완성, v0.3 잔여 Gap 해소, README/문서 정비로 오픈소스 출시 준비
>
> **Project**: Vali (Validate AI)
> **Version**: 0.4.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/vali-v04.plan.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v0.3에서 ESLint 플러그인/GitHub Action/SARIF를 완성했으나, 사용자가 자체 규칙을 추가할 수 없고, npm에 미배포 상태이며, ESLint 플러그인이 상대 경로를 사용하여 외부에서 설치 불가 |
| **Solution** | `defineRule()` API 공개, 커스텀 규칙 로더, npm publish 파이프라인, ESLint 플러그인 import 정리, v0.3 Gap 해소, README 재작성 |
| **Function/UX Effect** | `defineRule({ id, check })` 3줄로 사용자 규칙 추가, `npx vali check src/` 즉시 사용, `npm i eslint-plugin-vali`로 에디터 통합 |
| **Core Value** | 내부 도구에서 **커뮤니티 참여 가능한 오픈소스 프로젝트**로 전환, npm 생태계 진입 |

---

## 1. Architecture Overview

### 1.1 현재 구조 (v0.3)

```
CLI (commander)
  → scanner (fast-glob)
    → runner (rules[] + config)
      → rule.check(context) → Diagnostic[]
  → formatter (terminal/json/sarif)
  → fixer (strategies)
  → diff (git)

ESLint Plugin (packages/eslint-plugin-vali)
  → adapter: createESLintRule(valiRule)
  → import from '../../../src/rules/index.js' (상대 경로)

Types: Rule, RuleContext, Diagnostic, ValiConfig
Config: .valirc.json (rules, include, exclude)
```

### 1.2 v0.4 확장 구조

```
CLI (commander)
  → scanner (fast-glob)
    → runner (builtinRules + customRules + config)
      → rule.check(context) → Diagnostic[]
  → formatter (terminal/json/sarif) — helpUri 추가
  → fixer (strategies)
  → diff (git)

Public API (NEW)
  → defineRule() — 커스텀 규칙 정의 헬퍼
  → types re-export — Rule, RuleContext, Diagnostic, Severity

Custom Rule Loader (NEW)
  → .valirc.json의 customRules 글로브 패턴 해석
  → dynamic import()로 사용자 규칙 로드
  → 유효성 검증 + builtinRules에 병합

ESLint Plugin (import 경로 정리)
  → import { rules } from 'vali' (패키지 import)
  → 커스텀 규칙 자동 ESLint 래핑

npm Publish Pipeline (NEW)
  → package.json exports 필드
  → tsup 빌드 설정
  → publish 스크립트
```

### 1.3 데이터 흐름

```
                      .valirc.json
                     ┌──────┴──────┐
                     │ customRules  │
                     │ ["./cr/*.ts"]│
                     └──────┬──────┘
                            │ glob + dynamic import
                            ▼
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│ Built-in │────▶│  Custom Rule     │────▶│  All Rules   │
│ Rules(10)│     │  Loader          │     │  (merged)    │
└──────────┘     │  - validate()    │     └──────┬───────┘
                 │  - normalize()   │            │
                 └──────────────────┘            ▼
                                         ┌──────────────┐
         check(sourceFile) ◀─────────────│   Runner     │
                                         │  runRules()  │
                                         └──────┬───────┘
                                                │
                                         ┌──────▼───────┐
                                         │  Diagnostic[]│
                                         └──────────────┘
```

---

## 2. Type Definitions

### 2.1 기존 타입 (변경 없음)

```typescript
// src/types/index.ts — 기존 유지
export type Severity = 'error' | 'warning' | 'info';

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  fixable?: boolean;
  check(context: RuleContext): Diagnostic[];
}

export interface RuleContext {
  sourceFile: SourceFile;
  filePath: string;
  fileContent: string;
  config: ResolvedRuleConfig;
  projectRoot: string;
  typeChecker?: TypeChecker;
}

export interface Diagnostic {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  suggestion?: string;
}
```

### 2.2 신규 타입

```typescript
// src/types/index.ts — 추가

/** defineRule() 입력 옵션 */
export interface DefineRuleOptions {
  id: string;
  name: string;
  description: string;
  severity?: Severity;       // 기본값: 'warning'
  fixable?: boolean;         // 기본값: false
  check(context: RuleContext): Diagnostic[];
}

/** .valirc.json 확장 (customRules 필드 추가) */
export interface ValiConfig {
  rules?: Record<string, RuleConfig>;
  include?: string[];
  exclude?: string[];
  customRules?: string[];    // NEW: 글로브 패턴 배열
}

/** 커스텀 규칙 로드 결과 */
export interface CustomRuleLoadResult {
  rules: Rule[];
  errors: CustomRuleError[];
}

export interface CustomRuleError {
  path: string;
  error: string;
}

/** SARIF 규칙 디스크립터 확장 (helpUri 추가) */
export interface SarifRuleDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  helpUri?: string;          // NEW
}
```

---

## 3. Phase 1: 커스텀 규칙 API

### 3.1 defineRule() 헬퍼 — `src/api/define-rule.ts`

**FR-01**: `defineRule()` 헬퍼로 규칙 정의

```typescript
// src/api/define-rule.ts
import type { Rule, DefineRuleOptions, Severity } from '../types/index.js';

/**
 * 커스텀 Vali 규칙을 정의합니다.
 *
 * @example
 * import { defineRule } from 'vali';
 *
 * export default defineRule({
 *   id: 'CUSTOM001',
 *   name: 'no-console-log',
 *   description: '프로덕션 코드에서 console.log 금지',
 *   check({ sourceFile, filePath }) {
 *     const diagnostics = [];
 *     // ... AST 검사 로직
 *     return diagnostics;
 *   },
 * });
 */
export function defineRule(options: DefineRuleOptions): Rule {
  // id 유효성 검증
  if (!options.id || typeof options.id !== 'string') {
    throw new Error('defineRule: id는 필수 문자열입니다');
  }
  if (!options.name || typeof options.name !== 'string') {
    throw new Error('defineRule: name은 필수 문자열입니다');
  }
  if (typeof options.check !== 'function') {
    throw new Error('defineRule: check는 필수 함수입니다');
  }

  return {
    id: options.id,
    name: options.name,
    description: options.description ?? '',
    severity: options.severity ?? 'warning',
    fixable: options.fixable ?? false,
    check: options.check,
  };
}
```

**구현 세부사항**:
- 입력 유효성 검증: `id`, `name`, `check` 필수
- 기본값 적용: `severity` → `'warning'`, `fixable` → `false`
- 반환 타입은 기존 `Rule` 인터페이스와 100% 호환

### 3.2 Public API 진입점 — `src/api/index.ts`

```typescript
// src/api/index.ts
export { defineRule } from './define-rule.js';

// 타입 re-export (사용자 편의)
export type {
  Rule,
  RuleContext,
  Diagnostic,
  Severity,
  DefineRuleOptions,
  ResolvedRuleConfig,
} from '../types/index.js';
```

### 3.3 커스텀 규칙 로더 — `src/loader/custom-rule-loader.ts`

**FR-02**: `.valirc.json`에서 `customRules` 경로 지정

```typescript
// src/loader/custom-rule-loader.ts
import { resolve } from 'node:path';
import fg from 'fast-glob';
import type { Rule, CustomRuleLoadResult } from '../types/index.js';

/**
 * .valirc.json의 customRules 글로브 패턴으로 커스텀 규칙을 로드합니다.
 *
 * @param patterns - 글로브 패턴 배열 (예: ["./custom-rules/*.ts"])
 * @param projectRoot - 프로젝트 루트 경로
 * @returns 로드된 규칙 배열 + 에러 목록
 */
export async function loadCustomRules(
  patterns: string[],
  projectRoot: string,
): Promise<CustomRuleLoadResult> {
  const rules: Rule[] = [];
  const errors: CustomRuleError[] = [];

  // 글로브로 파일 탐색
  const files = await fg(patterns, {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
  });

  for (const filePath of files) {
    try {
      // dynamic import
      const mod = await import(filePath);
      const rule = mod.default ?? mod;

      // 유효성 검증
      validateRule(rule, filePath);
      rules.push(rule);
    } catch (err) {
      errors.push({
        path: filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rules, errors };
}

/**
 * 로드된 객체가 유효한 Rule인지 검증합니다.
 */
function validateRule(rule: unknown, filePath: string): asserts rule is Rule {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`'${filePath}'에서 Rule 객체를 export하지 않습니다`);
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new Error(`Rule.id가 없거나 유효하지 않습니다`);
  }
  if (typeof r.name !== 'string' || r.name.length === 0) {
    throw new Error(`Rule.name이 없거나 유효하지 않습니다`);
  }
  if (typeof r.check !== 'function') {
    throw new Error(`Rule.check이 함수가 아닙니다`);
  }
}
```

**핵심 설계 결정**:
- `fast-glob`으로 파일 탐색 (이미 의존성에 포함)
- `dynamic import()`로 ESM 모듈 로드
- `mod.default ?? mod` 패턴으로 default/named export 모두 지원
- 개별 규칙 로드 실패 시 나머지 계속 진행 (errors에 기록)

### 3.4 Config 확장 — `src/config/index.ts` 수정

**변경 내용**: `ValiConfig`에 `customRules` 처리 추가

```typescript
// src/config/index.ts — 변경 부분

const DEFAULT_CONFIG: ValiConfig = {
  rules: { /* 기존 동일 */ },
  include: ['**/*.{ts,tsx,js,jsx}'],
  exclude: [/* 기존 동일 */],
  customRules: [],  // NEW: 기본값 빈 배열
};

function mergeConfig(base: ValiConfig, user: ValiConfig): ValiConfig {
  return {
    rules: { ...base.rules, ...user.rules },
    include: user.include ?? base.include,
    exclude: user.exclude ?? base.exclude,
    customRules: user.customRules ?? base.customRules ?? [],  // NEW
  };
}
```

### 3.5 Runner 통합 — `src/analyzer/runner.ts` 수정

**변경 내용**: `runRules()`에 커스텀 규칙 배열 파라미터 추가

```typescript
// src/analyzer/runner.ts — 변경 부분

export function runRules(
  filePaths: string[],
  rules: Rule[],
  config: ValiConfig,
  projectRoot: string,
  options?: RunOptions,
): FileResult[] {
  // 기존 로직 동일 — rules 파라미터가 이미 외부에서 주입됨
  // 호출부(check.ts)에서 builtinRules + customRules를 합쳐서 전달
}
```

### 3.6 Check 커맨드 통합 — `src/cli/commands/check.ts` 수정

**변경 내용**: 커스텀 규칙 로드 후 합산

```typescript
// src/cli/commands/check.ts — 변경 부분

import { loadCustomRules } from '../../loader/custom-rule-loader.js';
import { rules as builtinRules } from '../../rules/index.js';

export async function checkCommand(
  targetPath: string,
  options: CheckOptions,
): Promise<void> {
  // ... 기존 경로 검증 로직 ...
  const config = loadConfig(projectRoot, /* ... */);

  // NEW: 커스텀 규칙 로드
  let allRules: Rule[] = [...builtinRules];
  if (config.customRules && config.customRules.length > 0) {
    const { rules: customRules, errors } = await loadCustomRules(
      config.customRules,
      projectRoot,
    );
    allRules = [...builtinRules, ...customRules];

    // 로드 에러 경고 출력
    for (const err of errors) {
      console.warn(`vali: warning — 커스텀 규칙 로드 실패: ${err.path} (${err.error})`);
    }
  }

  // runRules에 allRules 전달
  const fileResults = runRules(files, allRules, config, projectRoot);
  // ... 이하 기존 로직 동일 ...
}
```

### 3.7 커스텀 규칙 ESLint 자동 래핑 — ESLint 플러그인 수정

**FR-03**: 커스텀 규칙 자동 ESLint 래핑

```typescript
// packages/eslint-plugin-vali/src/index.ts — 변경

import { rules as valiRules } from 'vali/rules';
import { createESLintRule } from './adapter.js';

// 빌트인 규칙 래핑
const eslintRules: Record<string, any> = {};
for (const rule of valiRules) {
  eslintRules[rule.name] = createESLintRule(rule);
}

const plugin: any = {
  meta: {
    name: 'eslint-plugin-vali',
    version: '0.4.0',
  },
  rules: eslintRules,
  configs: {} as Record<string, any>,
};

// recommended config (flat config)
plugin.configs.recommended = {
  plugins: { vali: plugin },
  rules: Object.fromEntries(
    valiRules.map(r => [`vali/${r.name}`, r.severity === 'error' ? 'error' : 'warn'])
  ),
};

export default plugin;

/**
 * 커스텀 규칙을 ESLint 규칙으로 래핑하여 플러그인에 추가합니다.
 * 사용자가 eslint.config.js에서 호출:
 *
 * import vali from 'eslint-plugin-vali';
 * import myRule from './custom-rules/my-rule.ts';
 * vali.addCustomRule(myRule);
 */
export function addCustomRule(rule: any): void {
  plugin.rules[rule.name] = createESLintRule(rule);
}
```

### 3.8 커스텀 규칙 예제 3개 — `examples/`

**FR-04**: 커스텀 규칙 예제

#### 3.8.1 `examples/no-console-log.ts`

```typescript
import { defineRule } from 'vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: '프로덕션 코드에서 console.log 사용을 금지합니다',
  severity: 'warning',
  check({ sourceFile, filePath }) {
    const diagnostics = [];

    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const text = call.getExpression().getText();
      if (text === 'console.log') {
        diagnostics.push({
          ruleId: 'CUSTOM001',
          ruleName: 'no-console-log',
          severity: 'warning' as const,
          message: 'console.log를 사용하지 마세요',
          file: filePath,
          line: call.getStartLineNumber(),
          suggestion: 'logger 라이브러리를 사용하거나 console.log를 제거하세요',
        });
      }
    }

    return diagnostics;
  },
});
```

#### 3.8.2 `examples/max-function-lines.ts`

```typescript
import { defineRule } from 'vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM002',
  name: 'max-function-lines',
  description: '함수가 30줄을 초과하면 경고합니다',
  severity: 'warning',
  check({ sourceFile, filePath, config }) {
    const maxLines = (config.options.maxLines as number) ?? 30;
    const diagnostics = [];

    const functions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];

    for (const fn of functions) {
      const lineCount = fn.getEndLineNumber() - fn.getStartLineNumber() + 1;
      if (lineCount > maxLines) {
        const name = (fn as any).getName?.() ?? '(anonymous)';
        diagnostics.push({
          ruleId: 'CUSTOM002',
          ruleName: 'max-function-lines',
          severity: 'warning' as const,
          message: `함수 '${name}'이(가) ${lineCount}줄입니다 (최대: ${maxLines}줄)`,
          file: filePath,
          line: fn.getStartLineNumber(),
          endLine: fn.getEndLineNumber(),
          suggestion: `함수를 ${maxLines}줄 이하로 분리하세요`,
        });
      }
    }

    return diagnostics;
  },
});
```

#### 3.8.3 `examples/no-any-cast.ts`

```typescript
import { defineRule } from 'vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM003',
  name: 'no-any-cast',
  description: 'as any 타입 단언을 금지합니다',
  severity: 'error',
  check({ sourceFile, filePath }) {
    const diagnostics = [];

    for (const asExpr of sourceFile.getDescendantsOfKind(SyntaxKind.AsExpression)) {
      const typeNode = asExpr.getTypeNode();
      if (typeNode && typeNode.getText() === 'any') {
        diagnostics.push({
          ruleId: 'CUSTOM003',
          ruleName: 'no-any-cast',
          severity: 'error' as const,
          message: '`as any` 타입 단언은 타입 안전성을 손상시킵니다',
          file: filePath,
          line: asExpr.getStartLineNumber(),
          suggestion: '구체적인 타입을 지정하거나 unknown으로 대체하세요',
        });
      }
    }

    return diagnostics;
  },
});
```

### 3.9 커스텀 규칙 테스트 계획

| 테스트 파일 | 테스트 케이스 | 검증 대상 |
|-------------|-------------|----------|
| `tests/api/define-rule.test.ts` | defineRule 정상 생성 | 기본값 적용, 반환 타입 |
| | 필수 필드 누락 시 에러 | id/name/check 누락 |
| `tests/loader/custom-rule-loader.test.ts` | 글로브로 규칙 로드 | 파일 탐색 + import |
| | 잘못된 규칙 파일 | errors 배열에 기록 |
| | 빈 패턴 | 빈 배열 반환 |
| `tests/integration-custom.test.ts` | E2E: 커스텀 규칙 + CLI | .valirc.json → 검사 → 출력 |

**예상 신규 테스트**: 7개

---

## 4. Phase 2: npm 배포 정비

### 4.1 package.json exports 필드

**FR-07**: package.json `exports` 필드 설정

```json
{
  "name": "vali",
  "version": "0.4.0",
  "type": "module",
  "bin": {
    "vali": "./dist/cli/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./api": {
      "types": "./dist/api/index.d.ts",
      "import": "./dist/api/index.js"
    },
    "./rules": {
      "types": "./dist/rules/index.d.ts",
      "import": "./dist/rules/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    }
  },
  "files": [
    "dist"
  ]
}
```

**Export 매핑**:

| Import Path | 용도 | 대상 |
|-------------|------|------|
| `vali` (메인) | CLI 진입점 + defineRule 재export | `dist/index.js` |
| `vali/api` | Public API (defineRule + types) | `dist/api/index.js` |
| `vali/rules` | 내장 규칙 배열 (ESLint 플러그인용) | `dist/rules/index.js` |
| `vali/types` | 타입 정의만 | `dist/types/index.js` |

### 4.2 루트 진입점 — `src/index.ts` (신규)

```typescript
// src/index.ts — 패키지 메인 진입점
export { defineRule } from './api/define-rule.js';
export { rules, getRuleById, getRuleByName } from './rules/index.js';
export { loadConfig, resolveRuleConfig } from './config/index.js';

// 타입 re-export
export type {
  Rule,
  RuleContext,
  Diagnostic,
  Severity,
  DefineRuleOptions,
  ValiConfig,
  ResolvedRuleConfig,
  FixStrategy,
  FixAction,
} from './types/index.js';
```

### 4.3 tsup.config.ts — 루트 빌드 설정

**FR-08**: tsup.config.ts 루트 + ESLint 플러그인

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'api/index': 'src/api/index.ts',
    'rules/index': 'src/rules/index.ts',
    'types/index': 'src/types/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  splitting: true,      // 공유 코드 chunk 최적화
  treeshake: true,
});
```

### 4.4 ESLint 플러그인 import 경로 전환

**FR-05**: ESLint 플러그인 import `from 'vali'` 전환

**변경 파일**: `packages/eslint-plugin-vali/src/index.ts`

| Before (v0.3) | After (v0.4) |
|----------------|---------------|
| `import { rules } from '../../../src/rules/index.js'` | `import { rules } from 'vali/rules'` |
| `import type { Rule, ResolvedRuleConfig } from '../../../src/types/index.js'` | `import type { Rule, ResolvedRuleConfig } from 'vali/types'` |

**변경 파일**: `packages/eslint-plugin-vali/src/adapter.ts`

| Before (v0.3) | After (v0.4) |
|----------------|---------------|
| `import type { Rule as ValiRule, ResolvedRuleConfig } from '../../../src/types/index.js'` | `import type { Rule as ValiRule, ResolvedRuleConfig } from 'vali/types'` |

### 4.5 ESLint 플러그인 package.json 의존성 정리

**FR-05/06**: ESLint 플러그인 deps 정리

```json
{
  "name": "eslint-plugin-vali",
  "version": "0.4.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "eslint": ">=8.0.0",
    "vali": "^0.4.0"
  },
  "dependencies": {
    "ts-morph": "^23.0.0"
  }
}
```

**핵심 변경**: `vali`를 `peerDependencies`에 추가 → 상대 경로 의존 제거

### 4.6 npm publish 스크립트

**FR-06**: npm publish dry-run

```json
{
  "scripts": {
    "build": "tsup",
    "build:plugin": "cd packages/eslint-plugin-vali && tsup src/index.ts --format esm --dts",
    "build:all": "npm run build && npm run build:plugin",
    "prepublishOnly": "npm run build:all && npm run test",
    "publish:dryrun": "npm pack --dry-run && cd packages/eslint-plugin-vali && npm pack --dry-run",
    "publish:all": "npm publish && cd packages/eslint-plugin-vali && npm publish"
  }
}
```

### 4.7 npm 배포 테스트 계획

| 테스트 | 검증 대상 |
|--------|----------|
| `npm pack --dry-run` | 패키지 내용물 확인 (dist/ 포함) |
| `npm run build:all` | 빌드 성공 |
| exports 검증 | `import { defineRule } from 'vali'` 작동 |
| ESLint 플러그인 | `import vali from 'eslint-plugin-vali'` 작동 |

---

## 5. Phase 3: v0.3 Gap 해소

### 5.1 VAL010 `countCrossFileReferences()` — `src/rules/val010-unused-abstraction.ts`

**FR-09**: cross-file 참조 카운트

**현재 상태**: 파일 내 `countReferences()`만 사용 (단일 파일 범위)

**변경 설계**:

```typescript
// src/rules/val010-unused-abstraction.ts — 추가 함수

import { readFileSync } from 'node:fs';
import fg from 'fast-glob';

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
```

**Rule 로직 변경**: export된 타입도 검사 (cross-file 참조 포함)

```typescript
// check() 내부 — export된 타입 처리 변경
// Before: if (iface.getText().startsWith('export ')) continue;
// After:
if (iface.getText().startsWith('export ')) {
  // cross-file 참조 카운트
  const crossRefs = countCrossFileReferences(name, context.projectRoot, filePath);
  if (crossRefs > 0) continue; // 다른 파일에서 사용 중이면 skip

  // 파일 내 참조 + cross-file 모두 1회 이하
  const localRefs = countReferences(name, fileContent) - 1;
  if (localRefs + crossRefs <= 1) {
    diagnostics.push({
      ruleId: 'VAL010',
      ruleName: 'unused-abstraction',
      severity: 'info',
      message: `export된 인터페이스 '${name}'이(가) 프로젝트에서 거의 사용되지 않습니다 (참조: ${localRefs + crossRefs}회)`,
      file: filePath,
      line: iface.getStartLineNumber(),
      suggestion: 'export를 제거하거나 인라인 타입으로 전환을 고려하세요',
    });
  }
  continue;
}
```

**성능 보장**:
- `fg.sync()` 사용 (이미 의존성)
- 최대 100파일 제한 (Plan의 아키텍처 결정)
- `regex.test()`로 전체 파일 읽기 최소화

### 5.2 VAL008 impossibleError fixture — `tests/fixtures/excessive-error/`

**FR-10**: impossibleError fixture 추가

```typescript
// tests/fixtures/excessive-error/impossible-error.ts

// 패턴 4 테스트: 타입 시스템 기반 불가능한 에러
function safeAdd(a: number, b: number): number {
  return a + b;
}

function safePure(): string {
  return 'hello';
}

// 이 try-catch는 불필요 — 모든 함수 호출이 안전함
try {
  const result = safeAdd(1, 2);
  const msg = safePure();
  console.log(result, msg);
} catch (e) {
  console.error('impossible error', e);
}
```

**테스트 추가**: `tests/rules/val008.test.ts`

```typescript
it('불가능한 에러 케이스 감지 (impossibleError fixture)', () => {
  const filePath = resolve(FIXTURE_DIR, 'impossible-error.ts');
  const diagnostics = runRule(val008, filePath);
  // typeChecker 없이도 동기 순수 함수는 패턴 1로 감지
  expect(diagnostics.length).toBeGreaterThan(0);
  expect(diagnostics[0].message).toContain('에러를 발생시킬 수 있는 코드가 없습니다');
});
```

### 5.3 fixer.test.ts 2개 케이스 추가

**FR-11**: fixer.test.ts 2개 추가 케이스

```typescript
// tests/fixer.test.ts — 추가

it('dryRun=false일 때 실제 수정 반환', () => {
  const fixer = new Fixer();
  fixer.register(createMockStrategy());

  const diag: Diagnostic = {
    ruleId: 'VAL_TEST',
    ruleName: 'test',
    severity: 'warning',
    message: 'test',
    file: 'test.ts',
    line: 1,
  };

  const ctx = createMockContext('const x = BAD;');
  const result = fixer.fix([diag], ctx, { dryRun: false });

  expect(result.applied).toHaveLength(1);
  expect(result.applied[0].description).toBeDefined();
});

it('여러 진단에 대해 각각 수정 적용', () => {
  const fixer = new Fixer();
  fixer.register(createMockStrategy());

  const diags: Diagnostic[] = [
    { ruleId: 'VAL_TEST', ruleName: 'test', severity: 'warning', message: 'a', file: 'test.ts', line: 1 },
    { ruleId: 'VAL_TEST', ruleName: 'test', severity: 'warning', message: 'b', file: 'test.ts', line: 5 },
  ];

  const ctx = createMockContext('const x = BAD;\nconst y = BAD;');
  const result = fixer.fix(diags, ctx, { dryRun: true });

  expect(result.applied).toHaveLength(2);
});
```

### 5.4 SARIF helpUri 필드 추가

**FR-12**: SARIF helpUri 필드 추가

**변경 파일**: `src/cli/formatters/sarif.ts`

```typescript
// SarifRuleDescriptor 인터페이스에 helpUri 추가
interface SarifRuleDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  helpUri?: string;  // NEW
}

// formatSarif() 내 규칙 매핑 변경
rules: allRules.map(r => ({
  id: r.id,
  name: r.name,
  shortDescription: { text: r.description },
  defaultConfiguration: { level: severityToLevel(r.severity) },
  helpUri: `https://github.com/user/vali/blob/main/docs/api/rules.md#${r.name}`,
})),
```

**추가 변경**: `formatSarif()`의 `rules` import를 파라미터로 변경

```typescript
// Before: import { rules } from '../../rules/index.js';
// After: allRules를 ScanResult에서 가져오거나 파라미터로 전달

export function formatSarif(
  result: ScanResult,
  projectRoot: string,
  allRules?: Rule[],  // NEW: 커스텀 규칙 포함 전체 규칙
): string {
  const ruleList = allRules ?? rules;
  // ...
}
```

---

## 6. Phase 4: 문서 & 출시 준비

### 6.1 README.md 구조

**FR-13**: README.md 전면 재작성

```markdown
# 구조 설계

# vali — AI 생성 코드 품질 린터

## 배지 영역
npm version, license, test status, Node.js version

## 한줄 소개 + 설명 (3줄)

## 핵심 기능 (아이콘 + 텍스트, 4개)
- 10개 규칙: 환각 import, 빈 함수, 과잉 설계 등
- 자동 수정: --fix로 즉시 코드 정리
- ESLint 통합: 에디터에서 실시간 피드백
- 확장 가능: defineRule()로 커스텀 규칙 추가

## Quick Start (3단계)
1. npm install vali
2. npx vali check src/
3. 결과 확인

## 사용법
### CLI 사용법 (check, init, rules)
### 설정 (.valirc.json)
### 커스텀 규칙 (defineRule)
### ESLint 통합
### GitHub Action
### CI/CD (SARIF)

## 규칙 목록 (표: ID, 이름, 설명, 심각도, 자동수정)

## 기여하기 → CONTRIBUTING.md 링크

## 라이선스 MIT
```

### 6.2 CONTRIBUTING.md 구조

**FR-14**: CONTRIBUTING.md

```markdown
# 구조 설계

# Contributing to Vali

## 개발 환경 설정
- Node.js 18+, npm 9+
- git clone, npm install, npm run build

## 프로젝트 구조
- src/ 설명
- packages/ 설명
- tests/ 설명

## 새 규칙 추가 가이드
1. src/rules/valXXX-name.ts 생성
2. Rule 인터페이스 구현
3. src/rules/index.ts에 등록
4. tests/rules/valXXX.test.ts 작성
5. tests/fixtures/ 추가

## 커스텀 규칙 개발
- defineRule() API 사용법
- 예제 참조

## 테스트
- npm test
- vitest

## 코딩 컨벤션
- TypeScript strict
- ESM only
- 한국어 메시지

## PR 가이드라인
```

### 6.3 API 문서 — `docs/api/custom-rules.md`

**FR-15**: API 문서

```markdown
# 구조 설계

# 커스텀 규칙 작성 가이드

## defineRule() API
- 파라미터 설명 (id, name, description, severity, check)
- 반환값: Rule 객체
- 전체 TypeScript 타입 정의

## RuleContext 객체
- sourceFile: ts-morph SourceFile
- filePath: 파일 절대 경로
- fileContent: 파일 내용 문자열
- config: ResolvedRuleConfig
- projectRoot: 프로젝트 루트

## Diagnostic 반환 형식
- 필수 필드: ruleId, ruleName, severity, message, file, line
- 선택 필드: endLine, column, suggestion

## .valirc.json 설정
- customRules 글로브 패턴
- 커스텀 규칙 severity 오버라이드

## 예제 3개
- no-console-log
- max-function-lines
- no-any-cast
```

### 6.4 Configuration 문서 — `docs/api/configuration.md`

```markdown
# 구조 설계

# Vali 설정 가이드

## .valirc.json 스키마
- rules: 규칙별 활성화/비활성화/심각도/옵션
- include: 검사 대상 글로브
- exclude: 제외 대상 글로브
- customRules: 커스텀 규칙 경로 글로브

## 규칙 설정 형식
- boolean: true/false
- severity: 'error' | 'warning' | 'info'
- tuple: ['severity', { options }]

## CLI 옵션
- --format, --ci, --score, --config, --quiet, --fix, --dry-run, --diff

## 기본 설정값
```

### 6.5 CHANGELOG.md v0.4

```markdown
# 구조 설계

# Changelog

## [0.4.0] - 2026-03-11

### Added
- 커스텀 규칙 API: defineRule() 헬퍼
- 커스텀 규칙 로더: .valirc.json customRules 필드
- 커스텀 규칙 예제 3개
- npm publish 파이프라인
- package.json exports 필드
- tsup 빌드 설정
- README.md 전면 재작성
- CONTRIBUTING.md
- API 문서 (docs/api/)
- VAL010 cross-file 참조 카운트
- SARIF helpUri 필드

### Changed
- ESLint 플러그인 import 경로 정리 (상대 → 패키지)
- ESLint 플러그인 vali를 peerDependency로 이동

### Fixed
- VAL008 impossibleError fixture 추가
- fixer.test.ts 테스트 커버리지 확대

## [0.3.0] - 2026-03-11
(이전 버전 내역)
```

---

## 7. Implementation Items Summary

### 7.1 전체 구현 항목 (20개)

| # | Phase | Item | FR | Priority | 파일 | 변경 유형 |
|---|-------|------|-----|----------|------|----------|
| 1 | P1 | defineRule() 헬퍼 | FR-01 | High | `src/api/define-rule.ts` | 신규 |
| 2 | P1 | Public API 진입점 | FR-01 | High | `src/api/index.ts` | 신규 |
| 3 | P1 | 커스텀 규칙 로더 | FR-02 | High | `src/loader/custom-rule-loader.ts` | 신규 |
| 4 | P1 | ValiConfig customRules 필드 | FR-02 | High | `src/config/index.ts` | 수정 |
| 5 | P1 | Check 커맨드 커스텀 규칙 통합 | FR-02 | High | `src/cli/commands/check.ts` | 수정 |
| 6 | P1 | ESLint 커스텀 규칙 래핑 API | FR-03 | High | `packages/.../src/index.ts` | 수정 |
| 7 | P1 | 커스텀 규칙 예제 3개 | FR-04 | Medium | `examples/*.ts` | 신규 |
| 8 | P1 | 커스텀 규칙 테스트 | FR-01~03 | High | `tests/api/`, `tests/loader/` | 신규 |
| 9 | P2 | package.json exports 필드 | FR-07 | High | `package.json` | 수정 |
| 10 | P2 | 루트 진입점 (src/index.ts) | FR-07 | High | `src/index.ts` | 신규 |
| 11 | P2 | tsup.config.ts 빌드 설정 | FR-08 | Medium | `tsup.config.ts` | 신규 |
| 12 | P2 | ESLint 플러그인 import 전환 | FR-05 | High | `packages/.../src/*.ts` | 수정 |
| 13 | P2 | ESLint 플러그인 deps 정리 | FR-05 | High | `packages/.../package.json` | 수정 |
| 14 | P2 | npm publish dry-run 스크립트 | FR-06 | High | `package.json` | 수정 |
| 15 | P3 | VAL010 countCrossFileReferences | FR-09 | Medium | `src/rules/val010-...ts` | 수정 |
| 16 | P3 | VAL008 impossibleError fixture | FR-10 | Low | `tests/fixtures/...` | 신규 |
| 17 | P3 | fixer.test.ts 2개 케이스 | FR-11 | Low | `tests/fixer.test.ts` | 수정 |
| 18 | P3 | SARIF helpUri 필드 | FR-12 | Low | `src/cli/formatters/sarif.ts` | 수정 |
| 19 | P4 | README.md 재작성 | FR-13 | High | `README.md` | 수정 |
| 20 | P4 | CONTRIBUTING.md + API 문서 | FR-14~15 | Medium | `CONTRIBUTING.md`, `docs/api/` | 신규 |

### 7.2 신규/수정 파일 요약

**신규 파일 (9개)**:
1. `src/api/define-rule.ts`
2. `src/api/index.ts`
3. `src/loader/custom-rule-loader.ts`
4. `src/index.ts` (패키지 메인)
5. `tsup.config.ts`
6. `examples/no-console-log.ts`
7. `examples/max-function-lines.ts`
8. `examples/no-any-cast.ts`
9. `tests/fixtures/excessive-error/impossible-error.ts`

**수정 파일 (9개)**:
1. `src/types/index.ts` — DefineRuleOptions, ValiConfig.customRules
2. `src/config/index.ts` — customRules 처리
3. `src/cli/commands/check.ts` — 커스텀 규칙 로드 통합
4. `src/rules/val010-unused-abstraction.ts` — cross-file 참조
5. `src/cli/formatters/sarif.ts` — helpUri 필드
6. `packages/eslint-plugin-vali/src/index.ts` — import 경로 + addCustomRule
7. `packages/eslint-plugin-vali/src/adapter.ts` — import 경로
8. `package.json` — exports, scripts, version
9. `packages/eslint-plugin-vali/package.json` — deps, version

**신규 테스트 파일 (3개)**:
1. `tests/api/define-rule.test.ts`
2. `tests/loader/custom-rule-loader.test.ts`
3. `tests/integration-custom.test.ts`

**신규 문서 파일 (4개)**:
1. `README.md` (재작성)
2. `CONTRIBUTING.md`
3. `docs/api/custom-rules.md`
4. `docs/api/configuration.md`

### 7.3 예상 테스트 수

| 카테고리 | 현재 | 신규 | 합계 |
|---------|------|------|------|
| 규칙 테스트 (10개) | 43 | 1 (VAL008 fixture) | 44 |
| Fixer 테스트 | 3 | 2 | 5 |
| Config 테스트 | 4 | 0 | 4 |
| Integration | 3 | 1 (커스텀 규칙 E2E) | 4 |
| E2E CLI | 3 | 0 | 3 |
| Formatter (SARIF) | 3 | 1 (helpUri) | 4 |
| Diff | 2 | 0 | 2 |
| **신규: API** | 0 | 3 | 3 |
| **신규: Loader** | 0 | 3 | 3 |
| **합계** | **61** | **11** | **72** |

목표: 70개 이상 → **72개 달성 예상**

---

## 8. Dependency & Risk Analysis

### 8.1 구현 의존성 그래프

```
P1-1 defineRule()
P1-2 api/index.ts ─── depends on ──▶ P1-1
P1-3 custom-rule-loader ─── depends on ──▶ P1-1
P1-4 config customRules
P1-5 check.ts 통합 ─── depends on ──▶ P1-3, P1-4
P1-6 ESLint addCustomRule ─── depends on ──▶ P1-1
P1-7 예제 3개 ─── depends on ──▶ P1-1
P1-8 테스트 ─── depends on ──▶ P1-1, P1-3

P2-9 exports ─── depends on ──▶ P2-10
P2-10 src/index.ts ─── depends on ──▶ P1-2
P2-11 tsup.config.ts ─── depends on ──▶ P2-10
P2-12 ESLint import 전환 ─── depends on ──▶ P2-9, P2-11
P2-13 ESLint deps ─── depends on ──▶ P2-12
P2-14 publish dry-run ─── depends on ──▶ P2-11, P2-13

P3-15~18: 독립 (다른 Phase와 병행 가능)

P4-19~20: P1~P3 완료 후 (내용 참조 필요)
```

### 8.2 위험 요소

| Risk | Impact | Mitigation |
|------|--------|------------|
| dynamic import 경로 해석 | `import()` 시 상대/절대 경로 혼동 | `fg`의 `absolute: true` 사용 |
| tsup 멀티 entry 빌드 | chunk splitting 시 import 깨짐 | `splitting: true` + 수동 검증 |
| ESLint 플러그인 순환 의존 | vali ↔ eslint-plugin-vali | `peerDependencies`로 해결 |
| cross-file 참조 성능 | 대규모 프로젝트에서 느림 | MAX_FILES=100 제한 |
| npm workspaces link | 개발 시 `vali/rules` 해석 | `npm link` 또는 tsconfig paths |

---

## 9. Quality Checklist

- [ ] `defineRule()` API + 테스트 3개
- [ ] 커스텀 규칙 로더 + 테스트 3개
- [ ] 커스텀 규칙 예제 3개 동작 확인
- [ ] ESLint 플러그인 import 경로 전환 + 동작 확인
- [ ] package.json exports + tsup 빌드 성공
- [ ] npm pack --dry-run 성공
- [ ] VAL010 cross-file 참조 동작
- [ ] VAL008 impossibleError fixture 추가
- [ ] fixer.test.ts 5개 이상
- [ ] SARIF helpUri 필드 포함
- [ ] README.md 완성
- [ ] CONTRIBUTING.md 완성
- [ ] 전체 테스트 72개 이상 통과
- [ ] TypeScript strict 0 errors

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | 초안 — Plan 기반 20개 항목 설계 | Ryan |
