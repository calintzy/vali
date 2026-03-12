# Vali v0.2 Design Document

> **Summary**: 6개 신규 규칙, Fixer 엔진, Git diff 통합, ESLint 플러그인의 아키텍처 및 상세 설계
>
> **Project**: Vali (Validate AI)
> **Version**: 0.2.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft
> **Planning Doc**: [vali-v02.plan.md](../../01-plan/features/vali-v02.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- **규칙 확장**: v0.1의 4개 → 10개 규칙으로 확장, 기존 Rule 인터페이스 변경 없이 추가
- **자동 수정**: 안전한 규칙에 대해 AST 기반 코드 변환으로 자동 수정 지원
- **CI 최적화**: `--diff` 모드로 변경 파일만 검사하여 CI 실행 시간 단축
- **생태계 통합**: ESLint 플러그인으로 에디터 실시간 표시 및 기존 워크플로우 통합
- **하위 호환**: v0.1 API/설정/CLI 옵션 100% 하위 호환 유지

### 1.2 Design Principles

- **점진적 확장**: 기존 코드 수정 최소화, 새 모듈 추가 위주
- **Fix 안전성**: fix 가능한 규칙만 명시적으로 `fixable: true` 표시, dry-run 기본 제공
- **타입 안전성**: TypeChecker 기반 규칙은 타입 추론 실패 시 skip (false positive 방지)
- **성능 유지**: 규칙 추가에도 파일당 100ms 이내 분석 유지

---

## 2. Architecture

### 2.1 확장된 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  check   │  │   init   │  │  rules   │  (Commander.js)   │
│  │ +fix     │  └──────────┘  └──────────┘                   │
│  │ +diff    │                                                │
│  └────┬─────┘                                                │
│       │                                                      │
├───────▼──────────────────────────────────────────────────────┤
│                      Analyzer Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ Scanner  │─▶│  Parser  │─▶│ Rule Runner  │              │
│  │(glob+fs) │  │(ts-morph)│  │(rules 실행)   │              │
│  └──────────┘  └──────────┘  └──────┬───────┘              │
│  ┌──────────┐                       │                       │
│  │  Diff    │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ (NEW: git diff)     │
│  │ (execa)  │                       │                       │
│  └──────────┘                       │                       │
├─────────────────────────────────────▼───────────────────────┤
│                       Rules Layer                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ VAL001  │ │ VAL002  │ │ VAL003  │ │ VAL004  │         │
│  │halluc.  │ │halluc.  │ │empty fn │ │comment  │         │
│  │import   │ │api  NEW │ │         │ │bloat    │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ VAL005  │ │ VAL006  │ │ VAL007  │ │ VAL008  │         │
│  │over-eng │ │near-dup │ │dead     │ │excess.  │         │
│  │  NEW    │ │  NEW    │ │param NEW│ │error NEW│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│  ┌─────────┐ ┌─────────┐                                  │
│  │ VAL009  │ │ VAL010  │                                  │
│  │AI boil. │ │unused   │                                  │
│  │         │ │abst. NEW│                                  │
│  └─────────┘ └─────────┘                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Fixer Layer (NEW)                      │
│  ┌──────────────┐  ┌──────────────────────────────┐        │
│  │  Fixer       │  │  Fix Strategies              │        │
│  │  Engine      │──│  fix-dead-param.ts           │        │
│  │ (orchestrate)│  │  fix-ai-boilerplate.ts       │        │
│  └──────────────┘  │  fix-empty-function.ts       │        │
│                    └──────────────────────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                      Output Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Terminal     │  │    JSON      │  │   Scorer     │     │
│  │  Formatter    │  │  Formatter   │  │ (Slop Score) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                           │
│  ┌──────────────────────────────────────┐                  │
│  │  ConfigLoader (.valirc.json)         │                  │
│  │  - 10개 규칙 on/off, severity        │                  │
│  │  - include/exclude, fix 설정         │                  │
│  └──────────────────────────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                ESLint Plugin (NEW, 별도 패키지)              │
│  ┌──────────────────────────────────────┐                  │
│  │  eslint-plugin-vali                  │                  │
│  │  - Vali Rule → ESLint Rule 어댑터    │                  │
│  │  - recommended config preset        │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow (--fix 포함)

```
사용자 입력 (vali check --fix --diff src/)
    │
    ▼
┌─ Diff (optional) ───────────────┐
│  1. git diff --name-only HEAD    │
│  2. 변경 파일 목록 추출            │
│  3. include/exclude 필터링        │
└──────────────┬──────────────────┘
               │ string[] (변경 파일 목록)
               ▼
┌─ Scanner ────────────────────────┐
│  1. glob 패턴으로 대상 파일 수집    │
│  2. diff 파일과 교집합 (--diff)    │
└──────────────┬───────────────────┘
               │ string[]
               ▼
┌─ Parser + RuleRunner ────────────┐
│  1. 파일별 AST 파싱 + 규칙 실행    │
│  2. Diagnostic[] 수집             │
└──────────────┬───────────────────┘
               │ Diagnostic[]
               ▼
          ┌────┴────┐
     --fix?│        │ no fix
          ▼        ▼
┌─ Fixer ──────┐  ┌─ Scorer + Formatter ─┐
│ 1. fixable    │  │ 기존 v0.1 출력 흐름   │
│    규칙 필터   │  └──────────────────────┘
│ 2. dry-run?   │
│ 3. AST 변환   │
│ 4. 파일 저장   │
│ 5. FixResult  │
└───────┬──────┘
        │ FixResult[]
        ▼
┌─ Fix Reporter ──────────────────┐
│  수정된 파일/줄 수 요약 출력       │
└─────────────────────────────────┘
```

---

## 3. Data Model (v0.2 추가 타입)

### 3.1 Rule 인터페이스 확장

```typescript
// 기존 Rule 인터페이스에 fixable 추가 (선택적 필드, 하위호환)
export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  fixable?: boolean;              // NEW: 자동 수정 가능 여부
  check(context: RuleContext): Diagnostic[];
}
```

### 3.2 Fixer 타입

```typescript
// === Fix 전략 인터페이스 ===

export interface FixStrategy {
  ruleId: string;                  // "VAL007"
  canFix(diagnostic: Diagnostic, context: RuleContext): boolean;
  fix(diagnostic: Diagnostic, context: RuleContext): FixAction[];
}

export interface FixAction {
  type: 'remove' | 'replace' | 'insert';
  line: number;
  endLine?: number;
  oldText?: string;               // replace 시 원본
  newText?: string;               // replace/insert 시 대체
}

// === Fix 결과 ===

export interface FixResult {
  file: string;                    // 상대 경로
  applied: AppliedFix[];          // 적용된 수정 목록
  skipped: SkippedFix[];          // 건너뛴 수정 목록
}

export interface AppliedFix {
  ruleId: string;
  line: number;
  description: string;            // "죽은 파라미터 'options' 제거"
}

export interface SkippedFix {
  ruleId: string;
  line: number;
  reason: string;                 // "안전하지 않은 변환"
}
```

### 3.3 Diff 타입

```typescript
export interface DiffOptions {
  base?: string;                   // 비교 기준 (기본: HEAD)
  staged?: boolean;               // --staged 옵션
}
```

### 3.4 CheckOptions 확장

```typescript
export interface CheckOptions {
  format: 'terminal' | 'json';
  ci: boolean;
  score: boolean;
  config: string;
  quiet: boolean;
  fix?: boolean;                   // NEW
  dryRun?: boolean;               // NEW
  diff?: boolean;                  // NEW
  diffBase?: string;              // NEW
}
```

### 3.5 DEFAULT_CONFIG 확장

```typescript
const DEFAULT_CONFIG: ValiConfig = {
  rules: {
    'VAL001': true,
    'VAL002': true,                // NEW
    'VAL003': true,
    'VAL004': ['info', { threshold: 0.4 }],
    'VAL005': ['warning', { maxLayers: 3 }],  // NEW
    'VAL006': ['warning', { minLines: 5, similarity: 0.9 }], // NEW
    'VAL007': true,                // NEW
    'VAL008': ['warning', { allowAsync: true }], // NEW
    'VAL009': true,
    'VAL010': ['info', { minSize: 3 }],  // NEW
  },
  include: ['**/*.{ts,tsx,js,jsx}'],
  exclude: [
    'node_modules/**', 'dist/**', 'build/**',
    '.next/**', '**/*.d.ts', '**/*.min.js',
  ],
};
```

---

## 4. Rule Specifications (신규 6개)

### 4.1 VAL002: Hallucinated API (error)

**감지 대상**: 존재하지 않는 메서드/프로퍼티 호출

**알고리즘**:
```
1. ts-morph TypeChecker를 통해 프로젝트 전체 타입 정보 로드
2. AST에서 PropertyAccessExpression, ElementAccessExpression 추출
3. 각 접근에 대해:
   a. TypeChecker.getTypeAtLocation()으로 대상 객체의 타입 조회
   b. 타입에 해당 프로퍼티/메서드가 있는지 확인
   c. 없으면 Diagnostic 생성
4. 예외 처리:
   a. any 타입 → skip (타입 추론 불가)
   b. unknown/never 타입 → skip
   c. 동적 프로퍼티 접근 (obj[variable]) → skip
   d. optional chaining (?.) → skip (의도적 접근)
   e. 타입 추론 실패 → skip
```

**RuleContext 확장**:
```typescript
// VAL002는 TypeChecker가 필요하므로 RuleContext에 선택적 추가
export interface RuleContext {
  sourceFile: SourceFile;
  filePath: string;
  fileContent: string;
  config: ResolvedRuleConfig;
  projectRoot: string;
  typeChecker?: TypeChecker;      // NEW: VAL002, VAL007용
}
```

**예시**:
```typescript
// ⛔ error: Array.prototype.groupBy는 표준이 아님
const grouped = items.groupBy(item => item.type);

// ⛔ error: string에 toReversed 없음
const reversed = name.toReversed();

// ✅ 정상: 표준 API
const mapped = items.map(item => item.name);

// ✅ skip: any 타입
const result = (data as any).unknownMethod();
```

**severity**: error
**fixable**: false

### 4.2 VAL005: Over-Engineered (warning)

**감지 대상**: 단순 로직에 불필요한 디자인 패턴/추상화 적용

**감지 패턴**:
```typescript
const OVER_ENGINEERING_PATTERNS = {
  // 패턴 1: 구현체가 1개뿐인 인터페이스 + 클래스 조합
  singleImplementation: {
    description: '구현체가 1개뿐인 인터페이스',
    detect: '인터페이스 선언 + implements 사용이 1회인 클래스',
  },

  // 패턴 2: 팩토리 패턴 — 단순 생성을 팩토리로 래핑
  unnecessaryFactory: {
    description: '불필요한 Factory 패턴',
    detect: 'createXxx() 함수가 new Xxx()만 호출',
  },

  // 패턴 3: Strategy 패턴 — 분기가 2개 이하인데 Strategy 사용
  unnecessaryStrategy: {
    description: '불필요한 Strategy 패턴',
    detect: 'Strategy 인터페이스 + 구현체 2개 이하',
  },

  // 패턴 4: 과도한 래핑 — 단순 호출을 여러 레이어로 래핑
  excessiveWrapping: {
    description: '과도한 레이어 래핑',
    detect: '함수가 다른 함수를 인자 변환 없이 그대로 호출',
  },
};
```

**알고리즘**:
```
1. 프로젝트 내 interface 선언 + class implements 관계 수집
2. 구현체가 1개뿐인 인터페이스 감지 (singleImplementation)
3. createXxx/makeXxx 팩토리 함수가 new Xxx()만 호출하는지 확인
4. Strategy/Handler 패턴에서 구현체가 2개 이하인지 확인
5. 함수 body가 다른 함수의 단순 위임(pass-through)인지 확인
```

**설정 옵션**:
```json
{
  "VAL005": ["warning", { "maxLayers": 3 }]
}
```

**severity**: warning
**fixable**: false

### 4.3 VAL006: Near-Duplicate (warning)

**감지 대상**: 높은 유사도의 코드 블록 (코드 클론)

**알고리즘**:
```
1. 파일별 함수/메서드를 추출
2. 각 함수 body의 AST를 정규화:
   a. 식별자 이름 → 플레이스홀더 ($v1, $v2, ...)
   b. 리터럴 값 → 타입 플레이스홀더 ($str, $num, ...)
   c. 공백/주석 제거
3. 정규화된 AST의 해시값(SHA-256) 계산
4. 동일 해시 또는 유사도 threshold 이상 블록 쌍 감지
5. 최소 줄 수(기본 5줄) 이상인 블록만 보고
```

**유사도 계산**:
```typescript
function calculateSimilarity(a: string[], b: string[]): number {
  // LCS(Longest Common Subsequence) 기반 유사도
  const lcsLength = lcs(a, b);
  return (2 * lcsLength) / (a.length + b.length);
}
```

**설정 옵션**:
```json
{
  "VAL006": ["warning", { "minLines": 5, "similarity": 0.9 }]
}
```

**예시**:
```typescript
// ⚠️ warning: 92% similar to formatUser (line 10-25)
function formatAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name.trim(),
    email: admin.email.toLowerCase(),
    role: 'admin',
  };
}

// 위와 92% 유사
function formatUser(user: User) {
  return {
    id: user.id,
    name: user.name.trim(),
    email: user.email.toLowerCase(),
    role: 'user',
  };
}
```

**severity**: warning
**fixable**: false

### 4.4 VAL007: Dead Parameter (warning)

**감지 대상**: 함수 body에서 참조되지 않는 파라미터

**알고리즘**:
```
1. AST에서 FunctionDeclaration, MethodDeclaration, ArrowFunction 추출
2. 각 함수의 파라미터 목록 추출
3. 파라미터별 body 내 참조 여부 확인 (TypeChecker.findReferences 또는 AST 탐색)
4. 미참조 파라미터에 대해 Diagnostic 생성
5. 예외 처리:
   a. _ prefix 파라미터 → skip (의도적 무시)
   b. 구조 분해 파라미터 중 일부만 사용 → skip
   c. 콜백 시그니처 준수 (예: express middleware의 req, res, next) → skip
   d. abstract 메서드 → skip
   e. interface 구현 메서드의 필수 시그니처 → skip
   f. 마지막 파라미터가 아닌 중간 파라미터 → skip (시그니처 유지 필요)
```

**예시**:
```typescript
// ⚠️ warning: 'options' 파라미터가 사용되지 않음
function processData(data: Data, options: Options) {
  return data.map(d => d.value);
}

// ✅ skip: _ prefix
function handler(_req: Request, res: Response) {
  res.send('ok');
}

// ✅ skip: 중간 파라미터 (시그니처 유지)
function middleware(req: Request, res: Response, next: NextFunction) {
  next();  // req, res 미사용이지만 next 사용을 위해 필요
}
```

**severity**: warning
**fixable**: true (마지막 파라미터만)

### 4.5 VAL008: Excessive Error Handling (warning)

**감지 대상**: 불필요한 try-catch 또는 불가능한 에러 케이스 처리

**감지 패턴**:
```typescript
const EXCESSIVE_ERROR_PATTERNS = {
  // 패턴 1: 동기 순수 함수를 try-catch로 감싸기
  syncPureTryCatch: {
    description: '에러를 던지지 않는 동기 함수의 try-catch',
    detect: 'try 블록 내 Math.*, Array.map/filter/reduce, 순수 연산만 존재',
  },

  // 패턴 2: catch에서 원래 에러 무시
  swallowedError: {
    description: 'catch에서 에러를 무시하고 빈 처리',
    detect: 'catch 블록이 비어있거나 console.log만 존재',
  },

  // 패턴 3: 불가능한 에러 케이스
  impossibleError: {
    description: '타입 시스템상 불가능한 에러 처리',
    detect: 'typeof 체크 후 이미 보장된 타입에 대해 추가 방어',
  },

  // 패턴 4: 중복 에러 래핑
  doubleWrapping: {
    description: 'try-catch 안에 또 try-catch',
    detect: '중첩된 try-catch에서 같은 에러 타입 처리',
  },
};
```

**알고리즘**:
```
1. AST에서 TryStatement 추출
2. try 블록 내 호출 분석:
   a. 동기 순수 함수만 있으면 → syncPureTryCatch
   b. await/Promise 없는 단순 연산 → 불필요한 try-catch
3. catch 블록 분석:
   a. 빈 블록 또는 console.log만 → swallowedError
4. 중첩 try-catch 감지 → doubleWrapping
```

**설정 옵션**:
```json
{
  "VAL008": ["warning", { "allowAsync": true }]
}
```
- `allowAsync: true` → async 함수 내 try-catch는 허용 (기본값)

**severity**: warning
**fixable**: false

### 4.6 VAL010: Unused Abstraction (info)

**감지 대상**: 프로젝트 내 1회만 사용되는 interface/abstract class/type alias

**알고리즘**:
```
1. 프로젝트 전체에서 interface, abstract class, type alias 선언 수집
2. 각 선언에 대해 프로젝트 내 참조 횟수 계산:
   a. import 문에서의 참조
   b. implements/extends에서의 참조
   c. 타입 어노테이션에서의 참조
3. 참조가 1회(선언 자체 제외)이하인 경우 Diagnostic 생성
4. 예외 처리:
   a. export된 타입 (외부 패키지에서 사용 가능) → skip
   b. 제네릭 utility type → skip
   c. 파일 크기가 minSize(기본 3줄) 미만 → skip (간단한 alias)
   d. d.ts 파일 → skip
```

**설정 옵션**:
```json
{
  "VAL010": ["info", { "minSize": 3 }]
}
```

**severity**: info
**fixable**: false

---

## 5. Fixer Engine

### 5.1 Fixer 아키텍처

```typescript
// === Fixer 오케스트레이터 ===

export class Fixer {
  private strategies: Map<string, FixStrategy>;

  register(strategy: FixStrategy): void;

  async fix(
    diagnostics: Diagnostic[],
    context: RuleContext,
    options: { dryRun: boolean }
  ): Promise<FixResult>;
}
```

### 5.2 Fix 전략

| 규칙 | Fix 가능 | Fix 전략 | 안전성 |
|------|:--------:|----------|--------|
| VAL001 | ❌ | - | 패키지 설치가 필요하므로 자동 수정 불가 |
| VAL002 | ❌ | - | API 대체를 자동으로 판단 불가 |
| VAL003 | ✅ | TODO 주석이 있는 빈 함수에 `throw new Error('Not implemented')` 추가 | Medium |
| VAL004 | ❌ | - | 어떤 주석을 제거할지 판단 불가 |
| VAL005 | ❌ | - | 아키텍처 변경은 자동화 부적합 |
| VAL006 | ❌ | - | 중복 코드 통합은 수동 판단 필요 |
| VAL007 | ✅ | 마지막 미사용 파라미터 제거 | High |
| VAL008 | ❌ | - | 에러 핸들링 제거는 위험 |
| VAL009 | ✅ | AI 보일러플레이트 주석 줄 제거 | High |
| VAL010 | ❌ | - | 추상화 인라인은 수동 판단 필요 |

### 5.3 Fix Strategy 구현 예시

```typescript
// fix-dead-param.ts
const fixDeadParam: FixStrategy = {
  ruleId: 'VAL007',

  canFix(diagnostic, context): boolean {
    // 마지막 파라미터인 경우만 fix 가능
    return diagnostic.message.includes('마지막 파라미터');
  },

  fix(diagnostic, context): FixAction[] {
    return [{
      type: 'remove',
      line: diagnostic.line,
      oldText: extractParamText(diagnostic),
    }];
  },
};
```

### 5.4 Dry-Run 모드

```
vali check --fix --dry-run src/

🔧 Vali: Fix Preview (dry-run)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/api/handler.ts
  🔧 L56: VAL007 — 'options' 파라미터 제거 예정
  🔧 L1-3: VAL009 — AI 보일러플레이트 주석 제거 예정

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preview: 1 file | 2 fixes applicable
Run without --dry-run to apply fixes.
```

---

## 6. Git Diff Integration

### 6.1 Diff Module

```typescript
// src/diff/index.ts

import { execaSync } from 'execa';

export function getChangedFiles(
  projectRoot: string,
  options: DiffOptions = {},
): string[] {
  const base = options.base ?? 'HEAD';
  const args = ['diff', '--name-only', '--diff-filter=ACMR'];

  if (options.staged) {
    args.push('--staged');
  } else {
    args.push(base);
  }

  const result = execaSync('git', args, { cwd: projectRoot });
  return result.stdout
    .split('\n')
    .filter(f => f.trim().length > 0);
}
```

### 6.2 CLI 통합

```
vali check --diff src/          # HEAD와 비교, 변경 파일만 검사
vali check --diff --diff-base main  # main 브랜치와 비교
```

---

## 7. ESLint Plugin

### 7.1 플러그인 구조

```
packages/eslint-plugin-vali/
├── src/
│   ├── index.ts                 # 플러그인 진입점
│   ├── adapter.ts               # Vali Rule → ESLint Rule 변환
│   └── rules/                   # 개별 규칙 래퍼
│       ├── hallucinated-import.ts
│       ├── empty-function.ts
│       ├── comment-bloat.ts
│       ├── ai-boilerplate.ts
│       ├── dead-parameter.ts
│       └── ... (10개 규칙)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### 7.2 어댑터 패턴

```typescript
// adapter.ts
import type { Rule as ValiRule } from 'vali';
import type { Rule as ESLintRule } from 'eslint';

export function adaptRule(valiRule: ValiRule): ESLintRule.RuleModule {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: valiRule.description,
      },
      schema: [],
      fixable: valiRule.fixable ? 'code' : undefined,
    },
    create(context) {
      // ts-morph 파싱은 무거우므로 ESLint 용으로는
      // 텍스트/정규식 기반 경량 감지만 수행
      return {
        Program(node) {
          // 경량 감지 로직
        },
      };
    },
  };
}
```

### 7.3 사용법

```javascript
// eslint.config.js (flat config)
import vali from 'eslint-plugin-vali';

export default [
  vali.configs.recommended,
];

// .eslintrc.json (legacy config)
{
  "plugins": ["vali"],
  "extends": ["plugin:vali/recommended"]
}
```

### 7.4 recommended preset

```typescript
export const configs = {
  recommended: {
    plugins: { vali: plugin },
    rules: {
      'vali/hallucinated-import': 'error',
      'vali/hallucinated-api': 'error',
      'vali/empty-function': 'warn',
      'vali/comment-bloat': 'off',     // ESLint에서는 기본 off
      'vali/over-engineered': 'warn',
      'vali/near-duplicate': 'warn',
      'vali/dead-parameter': 'warn',
      'vali/excessive-error': 'warn',
      'vali/ai-boilerplate': 'off',    // ESLint에서는 기본 off
      'vali/unused-abstraction': 'off',
    },
  },
};
```

---

## 8. CLI 변경사항

### 8.1 check Command 옵션 추가

```
vali check <path> [options]

기존 Options:
  --format <type>  출력 형식: 'terminal' | 'json' (기본: 'terminal')
  --ci             CI 모드 (JSON 출력 + exit code 1 on error)
  --no-score       Slop Score 출력 생략
  --config <path>  설정 파일 경로 (기본: '.valirc.json')
  --quiet          error만 출력

NEW Options:
  --fix            자동 수정 적용
  --dry-run        수정 미리보기 (--fix와 함께 사용)
  --diff           Git 변경 파일만 검사
  --diff-base <ref>  diff 비교 기준 (기본: HEAD)
```

### 8.2 Terminal 출력 확장

fix 모드 출력:
```
🔧 Vali: Fix Applied
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/utils/helpers.ts
  ✅ L1-3: VAL009 — AI 보일러플레이트 주석 제거됨
  ✅ L45: VAL007 — 'options' 파라미터 제거됨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed: 1 file | 2 fixes applied | 0 skipped
```

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Tool | Coverage Goal |
|------|--------|------|---------------|
| Unit Test | 6개 신규 규칙 (VAL002, 005~008, 010) | Vitest | 90%+ |
| Unit Test | Fixer 엔진 + 3개 fix 전략 | Vitest | 90%+ |
| Unit Test | Diff 모듈 | Vitest | 90%+ |
| Unit Test | Config 로딩 (v0.1 Gap) | Vitest | 90%+ |
| Integration | Scanner→Parser→Rules 파이프라인 (v0.1 Gap) | Vitest | 80%+ |
| E2E | CLI 전체 흐름 + --fix + --diff (v0.1 Gap) | Vitest + execa | 주요 시나리오 |

### 9.2 신규 규칙 Test Cases

#### VAL002 (hallucinated-api)
- [ ] 존재하지 않는 메서드 호출 → error
- [ ] 표준 API 호출 → 통과
- [ ] any 타입 객체의 메서드 → skip
- [ ] optional chaining → skip

#### VAL005 (over-engineered)
- [ ] 구현체 1개인 인터페이스 → warning
- [ ] 불필요한 Factory 패턴 → warning
- [ ] 적절한 추상화 → 통과

#### VAL006 (near-duplicate)
- [ ] 90%+ 유사 함수 쌍 → warning
- [ ] 다른 로직의 함수 → 통과
- [ ] 5줄 미만 함수 → skip

#### VAL007 (dead-parameter)
- [ ] 미사용 마지막 파라미터 → warning
- [ ] 모든 파라미터 사용 → 통과
- [ ] _ prefix 파라미터 → skip
- [ ] 중간 파라미터 미사용 → skip (시그니처 유지)

#### VAL008 (excessive-error)
- [ ] 동기 순수 함수 try-catch → warning
- [ ] 빈 catch 블록 → warning
- [ ] async/await try-catch (allowAsync) → skip
- [ ] 실제 에러 가능한 try-catch → 통과

#### VAL010 (unused-abstraction)
- [ ] 1회 사용 인터페이스 → info
- [ ] 다회 사용 인터페이스 → 통과
- [ ] export된 타입 → skip

#### Fixer
- [ ] VAL007 fix: 마지막 파라미터 제거
- [ ] VAL009 fix: AI 보일러플레이트 제거
- [ ] VAL003 fix: throw 추가
- [ ] dry-run: 파일 미변경 확인

#### Diff
- [ ] 변경 파일만 반환 확인
- [ ] --diff-base 옵션 동작

### 9.3 Test Fixtures (신규)

```
tests/fixtures/
├── hallucinated-api/           # NEW
│   ├── bad-api.ts              # 없는 메서드 호출
│   ├── good-api.ts             # 표준 API
│   └── any-type.ts             # any 타입 skip
├── over-engineered/            # NEW
│   ├── single-impl.ts          # 구현체 1개 인터페이스
│   ├── unnecessary-factory.ts  # 불필요한 팩토리
│   └── proper-abstraction.ts   # 적절한 추상화
├── near-duplicate/             # NEW
│   ├── similar-functions.ts    # 유사 함수 쌍
│   └── different-functions.ts  # 다른 함수
├── dead-parameter/             # NEW
│   ├── unused-param.ts         # 미사용 파라미터
│   ├── used-param.ts           # 사용중 파라미터
│   └── underscore-param.ts     # _ prefix
├── excessive-error/            # NEW
│   ├── sync-pure-trycatch.ts   # 불필요 try-catch
│   ├── empty-catch.ts          # 빈 catch
│   └── proper-trycatch.ts      # 적절한 try-catch
└── unused-abstraction/         # NEW
    ├── single-use.ts           # 1회 사용 인터페이스
    └── multi-use.ts            # 다회 사용 인터페이스
```

---

## 10. Implementation Order

```
Phase 1: 테스트 보강 (v0.1 Gap 해소)
  1. [ ] tests/config.test.ts — loadConfig, resolveRuleConfig 단위 테스트
  2. [ ] tests/integration.test.ts — scanFiles→runRules 파이프라인
  3. [ ] tests/e2e/cli.test.ts — vali check/init/rules E2E
  4. [ ] VAL001 엣지 케이스 테스트 추가

Phase 2: 타입 확장 + 인프라
  5. [ ] types/index.ts — FixStrategy, FixResult, DiffOptions 타입 추가
  6. [ ] CheckOptions 확장 (fix, dryRun, diff, diffBase)
  7. [ ] config/index.ts — DEFAULT_CONFIG에 6개 규칙 추가
  8. [ ] analyzer/runner.ts — typeChecker 전달 옵션 추가

Phase 3: 신규 규칙 (타입 기반)
  9. [ ] VAL002: hallucinated-api + 테스트 + fixture
  10. [ ] VAL007: dead-parameter + 테스트 + fixture

Phase 4: 신규 규칙 (AST 패턴)
  11. [ ] VAL005: over-engineered + 테스트 + fixture
  12. [ ] VAL008: excessive-error + 테스트 + fixture
  13. [ ] VAL010: unused-abstraction + 테스트 + fixture

Phase 5: 신규 규칙 (코드 분석)
  14. [ ] VAL006: near-duplicate + 테스트 + fixture

Phase 6: Fixer 엔진
  15. [ ] fixer/index.ts — Fixer 오케스트레이터
  16. [ ] fixer/strategies/fix-dead-param.ts
  17. [ ] fixer/strategies/fix-ai-boilerplate.ts
  18. [ ] fixer/strategies/fix-empty-function.ts
  19. [ ] Fixer 테스트

Phase 7: Git Diff + CLI
  20. [ ] diff/index.ts — getChangedFiles
  21. [ ] cli/commands/check.ts — --fix, --dry-run, --diff 옵션
  22. [ ] cli/index.ts — 새 옵션 등록
  23. [ ] cli/formatters/terminal.ts — fix 결과 출력
  24. [ ] E2E 테스트 보강 (--fix, --diff)

Phase 8: ESLint 플러그인
  25. [ ] packages/eslint-plugin-vali/ — 패키지 초기화
  26. [ ] adapter.ts — Vali Rule → ESLint Rule 변환
  27. [ ] 10개 규칙 래퍼
  28. [ ] recommended config preset
  29. [ ] 플러그인 테스트

Phase 9: 마무리
  30. [ ] rules/index.ts — 6개 신규 규칙 레지스트리 등록
  31. [ ] 전체 테스트 + 커버리지 80% 확인
  32. [ ] npm publish 준비 (README, LICENSE, package.json)
```

---

## 11. Coding Conventions (v0.2 추가)

### 11.1 신규 모듈 네이밍

| Target | Rule | Example |
|--------|------|---------|
| Fix 전략 파일 | `fix-kebab-name.ts` | `fix-dead-param.ts` |
| ESLint 규칙 래퍼 | `kebab-name.ts` | `hallucinated-import.ts` |
| 테스트 fixture | `kebab-description.ts` | `unused-param.ts` |
| 타입 | PascalCase (기존) | `FixStrategy`, `FixResult` |

### 11.2 TypeChecker 사용 규칙

- TypeChecker가 필요한 규칙(VAL002, VAL007)은 `context.typeChecker` 사용
- TypeChecker 없이 호출될 수 있으므로 반드시 `if (!context.typeChecker) return []` 가드
- 타입 추론 실패 시 해당 항목 skip (false positive 방지)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial design from v0.2 Plan document | Ryan |
