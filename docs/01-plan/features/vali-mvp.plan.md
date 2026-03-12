# Vali MVP Planning Document

> **Summary**: AI 생성 코드의 환각, 슬롭, 과잉설계를 자동 감지하는 CLI 린터 MVP
>
> **Project**: Vali (Validate AI)
> **Version**: 0.1.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI 생성 코드(40%+)에 존재하는 환각 import, 빈 함수, 과잉 주석 등 고유 패턴을 기존 린터(ESLint, Biome)가 감지하지 못해 리뷰 부담이 증가하고 기술 부채가 누적됨 |
| **Solution** | AI 코드 고유 패턴(VAL001~VAL010)을 AST 기반으로 감지하는 TypeScript CLI 린터를 제공하여, `vali check src/` 한 줄로 AI 슬롭을 자동 검출 |
| **Function/UX Effect** | 터미널에서 파일별 문제 위치·심각도·설명을 컬러 출력하고, CI용 JSON 출력과 AI Slop Score(0~100)를 제공하여 즉시 조치 가능 |
| **Core Value** | AI 코드 리뷰 시간 50%+ 단축, 기술 부채 사전 차단, 팀 코드 품질 게이트 자동화 |

---

## 1. Overview

### 1.1 Purpose

AI가 생성한 코드에서 기존 린터가 잡지 못하는 고유한 문제 패턴(환각 import, 빈 함수, 과잉 주석, AI 보일러플레이트 등)을 자동으로 감지하여 코드 리뷰 부담을 줄이고 코드 품질을 보장한다.

### 1.2 Background

- 2026년 기업 코드의 40%+가 AI 생성 (GitHub Copilot, Claude, Cursor 등)
- AI 생성 코드의 38%가 "인간 코드보다 리뷰가 더 힘들다"고 응답 (Stack Overflow 2025 Survey)
- ESLint는 문법, TypeScript는 타입만 검사 — AI 코드 고유 패턴 전용 도구가 없음
- 경쟁 도구(KarpeSlop, sloppylint)는 초기 단계이거나 특정 언어에 한정

### 1.3 Related Documents

- 기획서: `기획서.md`

---

## 2. Scope

### 2.1 In Scope (MVP v0.1)

- [x] CLI 프레임워크 구축 (`vali check`, `vali init`, `vali rules`)
- [x] TypeScript/JavaScript AST 파싱 및 분석
- [x] VAL001: 환각 import 감지 (node_modules 실존 여부 체크)
- [x] VAL003: 빈 함수/스텁 감지 (TODO만 있는 함수)
- [x] VAL004: 주석 비율 분석 (comment bloat)
- [x] VAL009: AI 보일러플레이트 감지
- [x] 터미널 컬러 출력 (파일별 문제 리스트)
- [x] JSON 출력 모드 (`--ci`)
- [x] AI Slop Score 계산 (0~100)

### 2.2 Out of Scope

- VAL002 환각 API 감지 (v0.2)
- VAL005 과잉 설계 감지 (v0.2, AST 기반 패턴 매칭 필요)
- VAL006 유사 코드 블록 감지 (v0.2)
- VAL007 죽은 파라미터 감지 (v0.2)
- VAL008 과잉 에러 핸들링 감지 (v0.2)
- VAL010 미사용 추상화 감지 (v0.2)
- `--fix` 자동 수정 기능 (v0.2)
- `--diff` Git 변경분 체크 (v0.3)
- ESLint 플러그인 (v0.2)
- Python 지원 (v0.2)
- GitHub Action (v0.3)
- VS Code 확장 (v0.3)
- AI 기반 고급 패턴 감지 (v1.0)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `vali check <path>` 명령으로 디렉토리/파일 스캔 | High | Pending |
| FR-02 | VAL001: import/require 대상 패키지가 node_modules에 존재하는지 검증 | High | Pending |
| FR-03 | VAL003: 함수 body가 비어있거나 TODO/FIXME 주석만 있는 경우 감지 | High | Pending |
| FR-04 | VAL004: 파일 내 주석 비율이 임계값(기본 40%) 초과 시 경고 | Medium | Pending |
| FR-05 | VAL009: "This file contains...", "Helper functions for..." 등 AI 특유 서문 감지 | Medium | Pending |
| FR-06 | 결과를 severity별(error/warning/info) 컬러 터미널 출력 | High | Pending |
| FR-07 | `--format json` 또는 `--ci` 옵션으로 JSON 출력 | Medium | Pending |
| FR-08 | AI Slop Score (0~100) 계산 및 출력 | Medium | Pending |
| FR-09 | `vali init` 명령으로 `.valirc.json` 설정 파일 생성 | Low | Pending |
| FR-10 | `vali rules` 명령으로 활성 규칙 목록 출력 | Low | Pending |
| FR-11 | `.valirc.json`에서 규칙별 on/off 및 severity 설정 | Medium | Pending |
| FR-12 | glob 패턴으로 검사 대상/제외 파일 지정 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 1,000 파일 스캔 10초 이내 | 벤치마크 테스트 |
| Performance | 단일 파일 분석 100ms 이내 | 벤치마크 테스트 |
| Usability | `npx vali check src/` 한 줄로 즉시 사용 가능 | 사용자 테스트 |
| Compatibility | Node.js 18+ 지원 | CI 매트릭스 테스트 |
| Reliability | false positive rate 10% 이하 | 테스트 스위트 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 4개 규칙(VAL001, VAL003, VAL004, VAL009) 구현 완료
- [ ] CLI 명령어 3개(check, init, rules) 동작
- [ ] 터미널 컬러 출력 및 JSON 출력 지원
- [ ] AI Slop Score 계산 동작
- [ ] Unit 테스트 작성 및 통과
- [ ] `npx vali check` 로 실행 가능

### 4.2 Quality Criteria

- [ ] 테스트 커버리지 80% 이상
- [ ] 린트 에러 0건
- [ ] 빌드 성공
- [ ] 각 규칙별 테스트 케이스 최소 3개

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| False positive 높을 수 있음 | High | High | 보수적 기본값 설정, 규칙별 severity 조절 가능, 테스트 케이스로 정확도 검증 |
| AST 파싱 성능 이슈 | Medium | Low | ts-morph의 lazy loading 활용, 파일 단위 병렬 처리 |
| node_modules 탐색 비용 | Medium | Medium | 패키지 목록 캐싱, package.json dependencies 우선 확인 |
| 다양한 import 패턴 미지원 | Medium | Medium | dynamic import, re-export 등 단계적 지원, MVP는 static import에 집중 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules | Web apps, CLI tools, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Language | TypeScript / Go / Rust | TypeScript | npm 생태계 통합, ESLint 플러그인 호환, 타겟 사용자 친숙도 |
| AST Parser | ts-morph / @typescript-eslint/parser / tree-sitter | ts-morph | TypeScript 전용 고수준 API, AST 탐색 편의성 |
| CLI Framework | Commander.js / yargs / citty | Commander.js | 성숙한 생태계, 사용자 친숙도, 서브커맨드 지원 |
| Output | chalk + table / kleur / picocolors | chalk | 풍부한 컬러링, 널리 사용됨 |
| Bundler | tsup / esbuild / rollup | tsup | 빠른 번들링, TypeScript 네이티브 지원 |
| Testing | Vitest / Jest / node:test | Vitest | 빠른 실행, TypeScript 네이티브, ESM 지원 |
| Package Manager | npm / pnpm / bun | pnpm | 빠른 설치, 디스크 효율, 모노레포 대비 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure:
┌─────────────────────────────────────────────────────┐
│ vali/                                               │
│ ├── src/                                            │
│ │   ├── cli/              # CLI 진입점, 커맨드 정의   │
│ │   │   ├── index.ts      # 메인 진입점              │
│ │   │   ├── commands/     # check, init, rules       │
│ │   │   └── formatters/   # terminal, json 출력      │
│ │   ├── rules/            # 검증 규칙들               │
│ │   │   ├── index.ts      # 규칙 레지스트리            │
│ │   │   ├── val001-hallucinated-import.ts            │
│ │   │   ├── val003-empty-function.ts                 │
│ │   │   ├── val004-comment-bloat.ts                  │
│ │   │   └── val009-ai-boilerplate.ts                 │
│ │   ├── analyzer/         # AST 분석 엔진            │
│ │   │   ├── parser.ts     # ts-morph 파서 래퍼        │
│ │   │   └── scanner.ts    # 파일 스캐너              │
│ │   ├── scorer/           # AI Slop Score 계산       │
│ │   │   └── index.ts                                │
│ │   ├── config/           # .valirc.json 로딩        │
│ │   │   └── index.ts                                │
│ │   └── types/            # 공유 타입 정의            │
│ │       └── index.ts                                │
│ ├── tests/                # 테스트                   │
│ │   ├── rules/            # 규칙별 테스트             │
│ │   ├── fixtures/         # 테스트용 샘플 코드         │
│ │   └── e2e/              # CLI E2E 테스트           │
│ ├── package.json                                    │
│ ├── tsconfig.json                                   │
│ ├── tsup.config.ts                                  │
│ ├── vitest.config.ts                                │
│ └── .valirc.json          # 기본 설정 예시            │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Conventions to Define

| Category | Rule | Priority |
|----------|------|:--------:|
| **Naming** | 규칙 파일: `valXXX-kebab-name.ts`, 클래스: PascalCase, 함수: camelCase | High |
| **Folder structure** | 위 6.3 구조 준수 | High |
| **Import order** | node built-in → external → internal → types | Medium |
| **Error handling** | 규칙 실행 중 파싱 에러는 skip + warning 출력 | Medium |
| **Rule interface** | 모든 규칙은 `Rule` 인터페이스 구현 (id, name, severity, check) | High |

### 7.2 Rule Interface Convention

```typescript
interface Rule {
  id: string;          // "VAL001"
  name: string;        // "hallucinated-import"
  description: string; // 규칙 설명
  severity: 'error' | 'warning' | 'info';
  check(context: RuleContext): Diagnostic[];
}

interface Diagnostic {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  endLine?: number;
  suggestion?: string;
}
```

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`vali-mvp.design.md`)
2. [ ] 프로젝트 초기화 (`pnpm init`, TypeScript 설정)
3. [ ] 핵심 규칙 구현 시작 (VAL001 → VAL003 → VAL004 → VAL009)
4. [ ] 테스트 작성 및 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft from 기획서 분석 | Ryan |
