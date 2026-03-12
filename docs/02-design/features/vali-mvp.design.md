# Vali MVP Design Document

> **Summary**: AI 생성 코드 검증 CLI 린터의 아키텍처, 규칙 엔진, 데이터 흐름 설계
>
> **Project**: Vali (Validate AI)
> **Version**: 0.1.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft
> **Planning Doc**: [vali-mvp.plan.md](../../01-plan/features/vali-mvp.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- **확장 가능한 규칙 엔진**: 새 규칙을 파일 하나 추가로 등록 가능하게 설계
- **빠른 분석 속도**: 파일당 100ms 이내 분석, 1000 파일 10초 이내 완료
- **명확한 레이어 분리**: CLI → Analyzer → Rules → Formatter 단방향 의존
- **설정 가능한 동작**: `.valirc.json`으로 규칙별 on/off, severity, 임계값 조정

### 1.2 Design Principles

- **Single Responsibility**: 각 규칙은 독립 모듈, 하나의 패턴만 감지
- **Open/Closed**: 규칙 추가 시 기존 코드 수정 없이 레지스트리에 등록만
- **Fail-Safe**: 파싱 에러 시 해당 파일 skip + warning (전체 중단 금지)
- **Zero Config Start**: 설정 파일 없이도 기본값으로 즉시 사용 가능

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  check   │  │   init   │  │  rules   │  (Commander.js)   │
│  └────┬─────┘  └──────────┘  └──────────┘                   │
│       │                                                      │
├───────▼──────────────────────────────────────────────────────┤
│                      Analyzer Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ Scanner  │─▶│  Parser  │─▶│ Rule Runner  │              │
│  │(glob+fs) │  │(ts-morph)│  │(rules 실행)   │              │
│  └──────────┘  └──────────┘  └──────┬───────┘              │
│                                      │                      │
├──────────────────────────────────────▼──────────────────────┤
│                       Rules Layer                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ VAL001  │ │ VAL003  │ │ VAL004  │ │ VAL009  │         │
│  │halluc.  │ │empty fn │ │comment  │ │AI boil. │         │
│  │import   │ │         │ │bloat    │ │plate    │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Output Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Terminal     │  │    JSON      │  │   Scorer     │     │
│  │  Formatter    │  │  Formatter   │  │ (Slop Score) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                           │
│  ┌──────────────────────────────────────┐                  │
│  │  ConfigLoader (.valirc.json)         │                  │
│  │  - 규칙 on/off, severity, 임계값      │                  │
│  │  - include/exclude glob 패턴          │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
사용자 입력 (vali check src/)
    │
    ▼
┌─ Scanner ─────────────────────────┐
│  1. glob 패턴으로 대상 파일 수집       │
│  2. .valirc.json의 include/exclude  │
│  3. .ts, .tsx, .js, .jsx 필터링     │
└──────────────┬────────────────────┘
               │ string[] (파일 경로 목록)
               ▼
┌─ Parser ──────────────────────────┐
│  1. ts-morph Project 생성          │
│  2. 파일별 SourceFile 파싱          │
│  3. 파싱 실패 시 skip + warning     │
└──────────────┬────────────────────┘
               │ SourceFile[]
               ▼
┌─ RuleRunner ──────────────────────┐
│  1. 활성 규칙 목록 로드 (Config)     │
│  2. 각 파일에 대해 모든 규칙 실행     │
│  3. 규칙별 RuleContext 주입         │
│  4. Diagnostic[] 수집              │
└──────────────┬────────────────────┘
               │ Diagnostic[]
               ▼
┌─ Scorer ──────────────────────────┐
│  1. severity별 가중치 계산          │
│  2. AI Slop Score (0~100) 산출     │
└──────────────┬────────────────────┘
               │ ScanResult
               ▼
┌─ Formatter ───────────────────────┐
│  Terminal: 컬러 출력 (chalk)        │
│  JSON: 구조화된 JSON 출력           │
└───────────────────────────────────┘
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| CLI (commands) | Analyzer, Config, Formatter | 커맨드 실행 진입점 |
| Scanner | Config | glob 패턴으로 파일 수집 |
| Parser | ts-morph | TypeScript/JavaScript AST 파싱 |
| RuleRunner | Rules[], Config | 규칙 실행 및 결과 수집 |
| Rules | types (Rule, RuleContext) | 개별 규칙 로직 |
| Scorer | types (Diagnostic) | 점수 계산 |
| Formatter | types (ScanResult) | 결과 출력 |
| Config | fs (파일시스템) | .valirc.json 로딩 |

---

## 3. Data Model

### 3.1 Core Type Definitions

```typescript
// === 규칙 인터페이스 ===

interface Rule {
  id: string;                    // "VAL001"
  name: string;                  // "hallucinated-import"
  description: string;           // 규칙 설명
  severity: Severity;            // 기본 심각도
  check(context: RuleContext): Diagnostic[];
}

type Severity = 'error' | 'warning' | 'info';

// === 규칙 실행 컨텍스트 ===

interface RuleContext {
  sourceFile: SourceFile;        // ts-morph SourceFile
  filePath: string;              // 절대 경로
  fileContent: string;           // 원본 소스 코드
  config: ResolvedRuleConfig;    // 해당 규칙의 설정
  projectRoot: string;           // 프로젝트 루트 경로
}

// === 진단 결과 ===

interface Diagnostic {
  ruleId: string;                // "VAL001"
  ruleName: string;              // "hallucinated-import"
  severity: Severity;
  message: string;               // 사용자 표시 메시지
  file: string;                  // 상대 경로
  line: number;                  // 시작 줄 (1-based)
  endLine?: number;              // 종료 줄
  column?: number;               // 시작 열 (1-based)
  suggestion?: string;           // 수정 제안
}

// === 스캔 결과 ===

interface ScanResult {
  files: FileResult[];
  summary: ScanSummary;
  score: SlopScore;
}

interface FileResult {
  file: string;                  // 상대 경로
  diagnostics: Diagnostic[];
}

interface ScanSummary {
  totalFiles: number;
  filesWithIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

interface SlopScore {
  score: number;                 // 0~100
  grade: 'clean' | 'low' | 'moderate' | 'high' | 'critical';
}
```

### 3.2 Config Type Definitions

```typescript
// === 설정 파일 (.valirc.json) ===

interface ValiConfig {
  rules?: Record<string, RuleConfig>;  // 규칙별 설정
  include?: string[];                   // 포함 glob 패턴
  exclude?: string[];                   // 제외 glob 패턴
}

type RuleConfig =
  | boolean                             // true/false (on/off)
  | Severity                            // severity 변경
  | [Severity, RuleOptions];            // severity + 옵션

interface RuleOptions {
  [key: string]: unknown;               // 규칙별 커스텀 옵션
}

// === 해석된 규칙 설정 ===

interface ResolvedRuleConfig {
  enabled: boolean;
  severity: Severity;
  options: RuleOptions;
}

// === 기본 설정 ===

const DEFAULT_CONFIG: ValiConfig = {
  rules: {
    'VAL001': true,
    'VAL003': true,
    'VAL004': ['info', { threshold: 0.4 }],
    'VAL009': true,
  },
  include: ['**/*.{ts,tsx,js,jsx}'],
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    '**/*.d.ts',
    '**/*.min.js',
  ],
};
```

---

## 4. Rule Specifications

### 4.1 VAL001: Hallucinated Import (error)

**감지 대상**: 존재하지 않는 패키지를 import/require하는 코드

**알고리즘**:
```
1. AST에서 ImportDeclaration, require() 호출 추출
2. import 대상을 분류:
   a. 상대 경로 ('./foo', '../bar') → 파일 존재 여부 확인
   b. 패키지명 ('express', '@types/node') → node_modules 존재 확인
   c. Node.js 내장 모듈 ('fs', 'path', 'node:crypto') → 허용 목록 확인
3. 존재하지 않는 경우 Diagnostic 생성
```

**Node.js 내장 모듈 허용 목록**:
```typescript
const NODE_BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
  'fs', 'http', 'http2', 'https', 'module', 'net', 'os',
  'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'sys',
  'timers', 'tls', 'trace_events', 'tty', 'url', 'util',
  'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
]);
```

**패키지 존재 확인 전략**:
```
1차: package.json의 dependencies/devDependencies에 있는지 확인
2차: node_modules/{패키지명} 디렉토리 존재 확인
3차: 스코프 패키지(@scope/name) 처리
```

**예시**:
```typescript
// ⛔ error: 존재하지 않는 패키지
import { magic } from 'express-validator/magic';

// ✅ 정상: 존재하는 패키지
import express from 'express';

// ✅ 정상: Node.js 내장
import { readFileSync } from 'fs';
import { join } from 'node:path';
```

### 4.2 VAL003: Empty Function (warning)

**감지 대상**: 구현이 없거나 TODO/FIXME 주석만 있는 함수

**알고리즘**:
```
1. AST에서 FunctionDeclaration, MethodDeclaration,
   ArrowFunction, FunctionExpression 추출
2. body가 비어있는지 확인 (statements.length === 0)
3. body에 TODO/FIXME/HACK/XXX 주석만 있는지 확인
4. 예외 처리:
   a. abstract 메서드 → skip
   b. interface 선언 → skip
   c. 의도적 빈 함수 (noop 패턴) → skip
   d. 콜백 파라미터의 빈 화살표 함수 → skip
```

**Noop 허용 패턴**:
```typescript
// skip: 명시적 noop
const noop = () => {};
function noop() {}

// skip: 이벤트 핸들러 빈 콜백
element.addEventListener('click', () => {});

// ⚠️ warning: TODO만 있는 함수
function processData() {
  // TODO: implement this
}
```

### 4.3 VAL004: Comment Bloat (info)

**감지 대상**: 코드 대비 주석 비율이 과도한 파일

**알고리즘**:
```
1. 파일 내용을 줄 단위로 분석
2. 빈 줄, 코드 줄, 주석 줄 분류
3. commentRatio = 주석 줄 / (코드 줄 + 주석 줄)
4. threshold(기본 0.4) 초과 시 Diagnostic 생성
```

**주석 판별 기준**:
```
- 단일 줄 주석: //로 시작 (앞에 코드가 없는 줄)
- 블록 주석: /* ... */ (여러 줄 가능)
- JSDoc: /** ... */ (블록 주석과 동일 취급)
- 인라인 주석: 코드 뒤의 // → 코드 줄로 분류
```

**설정 옵션**:
```json
{
  "VAL004": ["info", { "threshold": 0.4 }]
}
```

### 4.4 VAL009: AI Boilerplate (info)

**감지 대상**: AI가 생성하는 특유의 서문/보일러플레이트 패턴

**패턴 목록**:
```typescript
const AI_BOILERPLATE_PATTERNS = [
  // 파일 서두 설명 패턴
  /^\/\/\s*(This|The)\s+(file|module|class|component)\s+(contains?|provides?|implements?|defines?|handles?|is responsible)/i,
  /^\/\*\*?\s*\n\s*\*\s*(This|The)\s+(file|module|class|component)\s+(contains?|provides?|implements?|defines?|handles?)/i,

  // 유틸리티 설명 패턴
  /^\/\/\s*(Utility|Helper)\s+(functions?|methods?|classes?)\s+for/i,

  // 자동 생성 표시 패턴
  /^\/\/\s*(Auto-?generated|Generated)\s+(by|from|using)/i,

  // 과도한 섹션 구분
  /^\/\/\s*={3,}\s*$/,
  /^\/\/\s*-{3,}\s*$/,

  // AI 특유의 과잉 친절 주석
  /^\/\/\s*(Note|Important|Remember):\s*(This|The|We|You)/i,
];
```

**알고리즘**:
```
1. 파일 상위 10줄의 주석 검사
2. 정규식 패턴 매칭으로 AI 보일러플레이트 감지
3. 매칭된 줄 번호와 패턴 종류를 Diagnostic에 포함
```

---

## 5. CLI Design

### 5.1 Command Structure

```
vali <command> [options]

Commands:
  check <path>     파일/디렉토리의 AI 코드 품질 검사
  init             .valirc.json 설정 파일 생성
  rules            활성 규칙 목록 출력

Global Options:
  --version        버전 출력
  --help           도움말 출력
```

### 5.2 check Command

```
vali check <path> [options]

Arguments:
  path             검사할 파일 또는 디렉토리 (기본: '.')

Options:
  --format <type>  출력 형식: 'terminal' | 'json' (기본: 'terminal')
  --ci             CI 모드 (JSON 출력 + exit code 1 on error)
  --no-score       Slop Score 출력 생략
  --config <path>  설정 파일 경로 (기본: '.valirc.json')
  --quiet          error만 출력 (warning, info 숨김)
```

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | 문제 없음 또는 warning/info만 존재 |
| 1 | error 수준 문제 발견 |
| 2 | 실행 오류 (파싱 실패, 설정 오류 등) |

### 5.3 Terminal Output Format

```
🔍 Vali: AI Code Quality Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/api/handler.ts
  ⛔ L3: hallucinated-import — 'express-validator/magic' does not exist
  ⚠️ L56: empty-function — processData() has only a TODO comment
  💬 L8-14: comment-bloat — 7 lines of comments for 3 lines of code

src/utils/helpers.ts
  💬 L1-5: ai-boilerplate — "This file contains utility functions for..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: 2 files | 1 error | 1 warning | 2 info
AI Slop Score: 34/100 (moderate — needs cleanup)
```

**Severity 아이콘 매핑**:
| Severity | Icon | Color (chalk) |
|----------|------|---------------|
| error | ⛔ | red |
| warning | ⚠️ | yellow |
| info | 💬 | blue |

### 5.4 JSON Output Format

```json
{
  "files": [
    {
      "file": "src/api/handler.ts",
      "diagnostics": [
        {
          "ruleId": "VAL001",
          "ruleName": "hallucinated-import",
          "severity": "error",
          "message": "'express-validator/magic' does not exist",
          "line": 3,
          "column": 1,
          "suggestion": "Check if the package is installed: npm ls express-validator"
        }
      ]
    }
  ],
  "summary": {
    "totalFiles": 2,
    "filesWithIssues": 2,
    "errorCount": 1,
    "warningCount": 1,
    "infoCount": 2
  },
  "score": {
    "score": 34,
    "grade": "moderate"
  }
}
```

---

## 6. AI Slop Score

### 6.1 Scoring Algorithm

```typescript
function calculateSlopScore(diagnostics: Diagnostic[]): SlopScore {
  const weights: Record<Severity, number> = {
    error: 10,    // 심각한 문제
    warning: 5,   // 주의 필요
    info: 2,      // 개선 권장
  };

  const totalWeight = diagnostics.reduce(
    (sum, d) => sum + weights[d.severity], 0
  );

  // 0~100 범위로 정규화 (cap at 100)
  const score = Math.min(totalWeight, 100);

  return { score, grade: getGrade(score) };
}

function getGrade(score: number): SlopScore['grade'] {
  if (score === 0) return 'clean';
  if (score <= 15) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 70) return 'high';
  return 'critical';
}
```

### 6.2 Grade Display

| Score | Grade | Label | Color |
|-------|-------|-------|-------|
| 0 | clean | clean — no AI slop detected | green |
| 1~15 | low | low — minor improvements possible | green |
| 16~40 | moderate | moderate — needs cleanup | yellow |
| 41~70 | high | high — significant issues | red |
| 71~100 | critical | critical — requires immediate attention | red (bold) |

---

## 7. Error Handling

### 7.1 에러 처리 전략

| 상황 | 처리 방식 |
|------|----------|
| 대상 경로 없음 | error 메시지 + exit code 2 |
| .valirc.json 파싱 실패 | warning + 기본 설정으로 진행 |
| 개별 파일 파싱 실패 | warning 출력 + 해당 파일 skip |
| 규칙 실행 중 예외 | warning 출력 + 해당 규칙 skip |
| node_modules 없음 | VAL001 skip + info 메시지 |
| package.json 없음 | VAL001에서 node_modules 직접 탐색 |

### 7.2 에러 메시지 형식

```
vali: error — Target path 'src/' does not exist

vali: warning — Could not parse src/broken.ts (SyntaxError: Unexpected token)
  Skipping file...

vali: info — No node_modules found. VAL001 (hallucinated-import) will be skipped.
```

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Coverage Goal |
|------|--------|------|---------------|
| Unit Test | 개별 규칙 로직 | Vitest | 90%+ |
| Unit Test | Scorer 계산 | Vitest | 100% |
| Unit Test | Config 로딩 | Vitest | 90%+ |
| Integration Test | Scanner → Parser → Rules 파이프라인 | Vitest | 80%+ |
| E2E Test | CLI 명령어 전체 흐름 | Vitest + execa | 주요 시나리오 |

### 8.2 Test Cases

#### VAL001 (hallucinated-import)
- [ ] 존재하지 않는 npm 패키지 import → error 발생
- [ ] 존재하는 npm 패키지 import → 통과
- [ ] Node.js 내장 모듈 import → 통과
- [ ] `node:` prefix 내장 모듈 → 통과
- [ ] 스코프 패키지 (@scope/name) → 정상 판별
- [ ] 상대 경로 import 존재하는 파일 → 통과
- [ ] 상대 경로 import 없는 파일 → error 발생

#### VAL003 (empty-function)
- [ ] 빈 body 함수 → warning 발생
- [ ] TODO만 있는 함수 → warning 발생
- [ ] 정상 구현 함수 → 통과
- [ ] noop 패턴 (`() => {}`) → 통과
- [ ] abstract 메서드 → 통과

#### VAL004 (comment-bloat)
- [ ] 주석 비율 50% 파일 → info 발생 (threshold 40%)
- [ ] 주석 비율 20% 파일 → 통과
- [ ] 인라인 주석만 있는 파일 → 코드 줄로 분류
- [ ] 커스텀 threshold 적용 → 정상 동작

#### VAL009 (ai-boilerplate)
- [ ] "This file contains..." 서문 → info 발생
- [ ] "Utility functions for..." 서문 → info 발생
- [ ] 일반 JSDoc 주석 → 통과
- [ ] 파일 중간의 설명 주석 → 통과 (상위 10줄만 검사)

#### Scorer
- [ ] error 1개 → score 10
- [ ] warning 2개 + info 1개 → score 12
- [ ] 문제 없음 → score 0, grade 'clean'
- [ ] score 100 초과 → cap at 100

#### CLI
- [ ] `vali check src/` → 터미널 출력 정상
- [ ] `vali check --format json` → JSON 출력 정상
- [ ] `vali check --ci` → exit code 정상
- [ ] `vali init` → .valirc.json 생성
- [ ] `vali rules` → 규칙 목록 출력

### 8.3 Test Fixtures

```
tests/fixtures/
├── hallucinated-import/
│   ├── bad-import.ts        # 없는 패키지 import
│   ├── good-import.ts       # 정상 import
│   └── builtin-import.ts    # Node.js 내장 모듈
├── empty-function/
│   ├── todo-only.ts         # TODO만 있는 함수
│   ├── empty-body.ts        # 빈 body 함수
│   └── normal-function.ts   # 정상 함수
├── comment-bloat/
│   ├── high-ratio.ts        # 주석 비율 높은 파일
│   └── normal-ratio.ts      # 정상 비율 파일
└── ai-boilerplate/
    ├── ai-header.ts         # AI 특유 서문
    └── normal-header.ts     # 일반 주석
```

---

## 9. Implementation Guide

### 9.1 File Structure

```
src/
├── cli/
│   ├── index.ts             # CLI 진입점 (Commander.js 설정)
│   ├── commands/
│   │   ├── check.ts         # check 커맨드
│   │   ├── init.ts          # init 커맨드
│   │   └── rules.ts         # rules 커맨드
│   └── formatters/
│       ├── terminal.ts      # 터미널 컬러 출력
│       └── json.ts          # JSON 출력
├── rules/
│   ├── index.ts             # 규칙 레지스트리 (배열 export)
│   ├── val001-hallucinated-import.ts
│   ├── val003-empty-function.ts
│   ├── val004-comment-bloat.ts
│   └── val009-ai-boilerplate.ts
├── analyzer/
│   ├── parser.ts            # ts-morph 프로젝트 생성/파일 파싱
│   ├── scanner.ts           # glob으로 대상 파일 수집
│   └── runner.ts            # 규칙 실행 엔진
├── scorer/
│   └── index.ts             # AI Slop Score 계산
├── config/
│   └── index.ts             # .valirc.json 로딩/해석
└── types/
    └── index.ts             # 공유 타입 (Rule, Diagnostic 등)
```

### 9.2 Implementation Order

```
Phase 1: Foundation (1~2일)
  1. [ ] 프로젝트 초기화 (pnpm, tsconfig, tsup, vitest)
  2. [ ] types/index.ts — 핵심 타입 정의
  3. [ ] config/index.ts — 설정 로딩
  4. [ ] analyzer/scanner.ts — 파일 수집
  5. [ ] analyzer/parser.ts — ts-morph 파서

Phase 2: Rules (2~3일)
  6. [ ] analyzer/runner.ts — 규칙 실행 엔진
  7. [ ] rules/val001-hallucinated-import.ts
  8. [ ] rules/val003-empty-function.ts
  9. [ ] rules/val004-comment-bloat.ts
  10. [ ] rules/val009-ai-boilerplate.ts
  11. [ ] rules/index.ts — 규칙 레지스트리

Phase 3: Output (1~2일)
  12. [ ] scorer/index.ts — Slop Score 계산
  13. [ ] cli/formatters/terminal.ts — 터미널 출력
  14. [ ] cli/formatters/json.ts — JSON 출력

Phase 4: CLI (1일)
  15. [ ] cli/commands/check.ts — check 커맨드
  16. [ ] cli/commands/init.ts — init 커맨드
  17. [ ] cli/commands/rules.ts — rules 커맨드
  18. [ ] cli/index.ts — 메인 진입점
  19. [ ] package.json bin 설정

Phase 5: Testing (1~2일)
  20. [ ] tests/fixtures/ — 테스트 샘플 파일
  21. [ ] 규칙별 unit 테스트
  22. [ ] scorer 테스트
  23. [ ] CLI e2e 테스트
```

### 9.3 Dependencies (package.json)

```json
{
  "name": "vali",
  "version": "0.1.0",
  "description": "AI 생성 코드 검증 린터",
  "type": "module",
  "bin": {
    "vali": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "fast-glob": "^3.3.0",
    "ts-morph": "^23.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 10. Coding Conventions

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| 규칙 파일 | `valXXX-kebab-name.ts` | `val001-hallucinated-import.ts` |
| 규칙 ID | `VALXXX` (대문자 + 3자리) | `VAL001`, `VAL009` |
| 함수 | camelCase | `checkImport()`, `calculateScore()` |
| 타입/인터페이스 | PascalCase | `Rule`, `Diagnostic`, `ScanResult` |
| 상수 | UPPER_SNAKE_CASE | `NODE_BUILTINS`, `DEFAULT_CONFIG` |
| 파일 (일반) | kebab-case.ts | `rule-runner.ts`, `slop-score.ts` |

### 10.2 Import Order

```typescript
// 1. Node.js 내장 모듈
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// 2. 외부 패키지
import { Project, SourceFile } from 'ts-morph';
import chalk from 'chalk';

// 3. 내부 모듈
import { loadConfig } from '../config/index.js';
import { calculateScore } from '../scorer/index.js';

// 4. 타입 imports
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial design from Plan document | Ryan |
