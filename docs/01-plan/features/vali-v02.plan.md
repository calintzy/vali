# Vali v0.2 Planning Document

> **Summary**: 심화 분석 규칙(VAL002, VAL005~VAL008, VAL010), 자동 수정(--fix), ESLint 플러그인, 테스트 커버리지 보강
>
> **Project**: Vali (Validate AI)
> **Version**: 0.2.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v0.1에서 4개 규칙만 구현되어 환각 API, 과잉 설계, 유사 코드 반복, 죽은 파라미터, 과잉 에러 핸들링 등 핵심 AI 슬롭 패턴이 미감지 상태이며, 감지 후 자동 수정 기능이 없어 사용자가 직접 수정해야 함 |
| **Solution** | 6개 신규 규칙(VAL002, VAL005~VAL008, VAL010)과 `--fix` 자동 수정, `--diff` Git 변경분 체크를 구현하고, ESLint 플러그인으로 기존 생태계 통합 및 테스트 커버리지를 80%+ 달성 |
| **Function/UX Effect** | `vali check --fix src/`로 안전한 문제 자동 수정, `vali check --diff`로 변경분만 검사하여 CI 속도 향상, ESLint 연동으로 에디터 실시간 표시 지원 |
| **Core Value** | AI 코드 감지 규칙 10개 완성 + 자동 수정으로 "감지→조치" 원스톱 워크플로우 달성, ESLint 통합으로 기존 도구 사용자 즉시 채택 가능 |

---

## 1. Overview

### 1.1 Purpose

v0.1 MVP에서 구현된 4개 핵심 규칙(VAL001, VAL003, VAL004, VAL009)을 기반으로, 기획서에 정의된 나머지 6개 규칙을 구현하고 자동 수정 기능을 추가하여 Vali의 감지-수정 워크플로우를 완성한다.

### 1.2 Background

- v0.1 PDCA 완료: Match Rate 95%, 15/15 테스트 통과, CLI 정상 동작 확인
- v0.1에서 미구현 항목: 6개 규칙(VAL002, VAL005~VAL008, VAL010), `--fix`, `--diff`, ESLint 플러그인
- Gap Analysis에서 테스트 커버리지 65%로 Config/Integration/E2E 테스트 부족 지적
- 기획서 v0.2 로드맵: 과잉 설계 감지, 유사 코드 블록 감지, 자동 수정, ESLint 플러그인

### 1.3 Related Documents

- 기획서: `기획서.md`
- v0.1 Plan: `docs/01-plan/features/vali-mvp.plan.md`
- v0.1 Design: `docs/02-design/features/vali-mvp.design.md`
- v0.1 Analysis: `docs/03-analysis/vali-mvp.analysis.md`
- v0.1 Report: `docs/04-report/features/vali-mvp.report.md`

---

## 2. Scope

### 2.1 In Scope (v0.2)

- [x] v0.1 테스트 커버리지 보강 (Config, Integration, E2E)
- [ ] VAL002: 환각 API 감지 (존재하지 않는 메서드/프로퍼티 사용)
- [ ] VAL005: 과잉 설계 감지 (불필요한 디자인 패턴/추상화)
- [ ] VAL006: 유사 코드 블록 감지 (코드 클론)
- [ ] VAL007: 죽은 파라미터 감지 (사용되지 않는 함수 인자)
- [ ] VAL008: 과잉 에러 핸들링 감지 (불필요한 try-catch)
- [ ] VAL010: 미사용 추상화 감지 (한 번만 사용되는 인터페이스/클래스)
- [ ] `--fix` 자동 수정 기능 (안전한 규칙만)
- [ ] `--diff` Git 변경분 체크
- [ ] ESLint 플러그인 (`eslint-plugin-vali`)

### 2.2 Out of Scope

- Python 지원 (v0.3으로 연기 — tree-sitter 통합 필요)
- GitHub Action (v0.3)
- VS Code 확장 (v0.3)
- PR 코멘트 연동 (v0.3)
- 커스텀 규칙 작성 API (v0.3)
- AI 기반 고급 패턴 감지 (v1.0)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | VAL002: TypeScript 타입 정보 기반 존재하지 않는 메서드/프로퍼티 호출 감지 | High | Pending |
| FR-02 | VAL005: 단순 CRUD에 Strategy/Factory/Abstract 패턴 등 불필요 추상화 감지 | Medium | Pending |
| FR-03 | VAL006: AST 기반 코드 유사도 분석, 90%+ 유사 블록 감지 (최소 5줄 이상) | Medium | Pending |
| FR-04 | VAL007: 함수 파라미터 중 body에서 미참조 인자 감지 (구조 분해 제외) | Medium | Pending |
| FR-05 | VAL008: 순수 함수 호출을 try-catch로 감싸거나, 불가능한 에러 케이스 처리 감지 | Medium | Pending |
| FR-06 | VAL010: 프로젝트 내 1회만 사용되는 interface/abstract class/type alias 감지 | Low | Pending |
| FR-07 | `--fix` 옵션으로 안전한 자동 수정 (AI boilerplate 제거, 죽은 파라미터 제거) | High | Pending |
| FR-08 | `--diff` 옵션으로 `git diff` 기준 변경 파일만 검사 | Medium | Pending |
| FR-09 | ESLint 플러그인으로 Vali 규칙 제공 (`eslint-plugin-vali`) | Medium | Pending |
| FR-10 | v0.1 테스트 보강: Config 단위, Integration, E2E CLI 테스트 | High | Pending |
| FR-11 | 각 신규 규칙별 테스트 케이스 최소 3개 + fixture 파일 | High | Pending |
| FR-12 | `--fix` 적용 결과 dry-run 모드 (`--fix --dry-run`) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 1,000 파일 스캔 15초 이내 (6개 규칙 추가 후) | 벤치마크 테스트 |
| Performance | `--diff` 모드 3초 이내 (변경 파일 50개 기준) | 벤치마크 테스트 |
| Test Coverage | 전체 커버리지 80% 이상 | `vitest --coverage` |
| Compatibility | ESLint v8/v9 호환 | CI 매트릭스 |
| Reliability | false positive rate 10% 이하 유지 | 오픈소스 프로젝트 벤치마크 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 10개 규칙(VAL001~VAL010) 전체 구현 완료
- [ ] `--fix` 자동 수정 동작 (최소 VAL007, VAL009)
- [ ] `--diff` Git 변경분 검사 동작
- [ ] ESLint 플러그인 기본 동작
- [ ] 테스트 커버리지 80% 이상
- [ ] 모든 테스트 통과
- [ ] npm publish 준비 완료 (README, LICENSE)

### 4.2 Quality Criteria

- [ ] 테스트 커버리지 80% 이상
- [ ] TypeScript strict 모드 에러 0건
- [ ] 빌드 성공
- [ ] 각 규칙별 테스트 케이스 최소 3개
- [ ] E2E CLI 테스트 주요 시나리오 커버

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| VAL002 타입 분석 정확도 | High | High | ts-morph의 TypeChecker API 활용, 타입 추론 실패 시 skip |
| VAL005 과잉 설계 판단 주관성 | Medium | High | 보수적 기준 (3+ 불필요 레이어만 감지), 규칙별 threshold 설정 |
| VAL006 코드 클론 감지 성능 | Medium | Medium | AST 정규화 후 해시 비교, 파일 단위 캐싱 |
| ESLint 플러그인 v8/v9 호환성 | Medium | Medium | flat config + legacy config 동시 지원, CI 매트릭스 테스트 |
| `--fix` 안전성 (코드 손상) | High | Low | 안전한 규칙만 fix 지원, dry-run 기본 제공, 원본 백업 |
| false positive 증가 | High | Medium | 각 규칙별 보수적 threshold, 광범위 fixture 테스트 |

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
| 코드 클론 감지 | jscpd 라이브러리 / 자체 구현 | 자체 구현 (AST 해시) | 외부 의존성 최소화, AST 수준 정규화로 정확도 향상 |
| 타입 분석 | ts-morph TypeChecker / TypeScript API 직접 | ts-morph TypeChecker | v0.1과 일관된 API, 타입 추론 + 심볼 조회 내장 |
| ESLint 플러그인 | 별도 패키지 / 같은 패키지 export | 별도 패키지 (`eslint-plugin-vali`) | npm 설치 편의성, ESLint 생태계 표준 |
| `--fix` 구현 | ts-morph AST 변환 / 텍스트 기반 | ts-morph AST 변환 | 안전한 코드 변환, 포맷 유지 |
| `--diff` 구현 | simple-git / execa git | execa git diff | 이미 devDep에 설치됨, 가벼운 구현 |

### 6.3 v0.2 폴더 구조 확장

```
vali/
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   └── check.ts          # --fix, --diff 옵션 추가
│   │   └── formatters/
│   ├── rules/
│   │   ├── val002-hallucinated-api.ts    # NEW
│   │   ├── val005-over-engineered.ts     # NEW
│   │   ├── val006-near-duplicate.ts      # NEW
│   │   ├── val007-dead-parameter.ts      # NEW
│   │   ├── val008-excessive-error.ts     # NEW
│   │   ├── val010-unused-abstraction.ts  # NEW
│   │   └── index.ts              # 레지스트리에 6개 규칙 추가
│   ├── fixer/                    # NEW: 자동 수정 엔진
│   │   ├── index.ts              # fix 오케스트레이터
│   │   └── strategies/           # 규칙별 fix 전략
│   │       ├── fix-dead-param.ts
│   │       ├── fix-ai-boilerplate.ts
│   │       └── fix-empty-function.ts
│   ├── diff/                     # NEW: Git diff 통합
│   │   └── index.ts              # git diff 파일 목록 추출
│   ├── analyzer/
│   ├── scorer/
│   ├── config/
│   └── types/
│       └── index.ts              # FixResult, DiffOptions 타입 추가
├── packages/
│   └── eslint-plugin-vali/       # NEW: ESLint 플러그인
│       ├── src/
│       │   ├── index.ts          # 플러그인 진입점
│       │   └── rules/            # ESLint 규칙 래퍼
│       ├── package.json
│       └── tsconfig.json
├── tests/
│   ├── rules/                    # 6개 신규 규칙 테스트 추가
│   ├── fixtures/                 # 6개 신규 fixture 디렉토리
│   ├── config.test.ts            # NEW: Config 단위 테스트
│   ├── integration.test.ts       # NEW: 통합 테스트
│   └── e2e/
│       └── cli.test.ts           # NEW: CLI E2E 테스트
└── package.json
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (v0.1에서 확립)

- [x] 규칙 파일: `valXXX-kebab-name.ts`
- [x] 규칙 ID: `VALXXX` (대문자 + 3자리)
- [x] 함수: camelCase, 타입: PascalCase, 상수: UPPER_SNAKE_CASE
- [x] Import 순서: node built-in → external → internal → types
- [x] Rule 인터페이스: `{ id, name, description, severity, check() }`
- [x] Error handling: 파싱 에러 skip + warning

### 7.2 v0.2 추가 컨벤션

| Category | Rule | Priority |
|----------|------|:--------:|
| **Fix 전략 파일** | `fix-kebab-name.ts` (fixer/strategies/) | High |
| **Fix 인터페이스** | `FixStrategy { ruleId, canFix(), fix() }` 패턴 | High |
| **ESLint 규칙 래퍼** | `vali/rule-name` 형식 (kebab-case) | Medium |
| **테스트 네이밍** | `*.test.ts`, describe 블록에 규칙 ID 포함 | High |
| **Fixture 구조** | `tests/fixtures/{rule-name}/` 디렉토리 | High |

---

## 8. Implementation Priority

### 8.1 Phase 순서

```
Phase 1: 테스트 보강 (v0.1 Gap 해소)
  1. Config 단위 테스트
  2. Integration 테스트 (Scanner→Parser→Rules)
  3. E2E CLI 테스트 (execa)
  4. VAL001 엣지 케이스 (상대경로, 스코프 패키지)

Phase 2: 신규 규칙 — 타입 기반 (난이도 높음)
  5. VAL002: 환각 API 감지 (TypeChecker 활용)
  6. VAL007: 죽은 파라미터 감지

Phase 3: 신규 규칙 — AST 패턴 (난이도 중)
  7. VAL005: 과잉 설계 감지
  8. VAL008: 과잉 에러 핸들링 감지
  9. VAL010: 미사용 추상화 감지

Phase 4: 신규 규칙 — 코드 분석 (난이도 중~높)
  10. VAL006: 유사 코드 블록 감지

Phase 5: 자동화 기능
  11. Fixer 엔진 + fix 전략 (VAL007, VAL009, VAL003)
  12. --diff Git 변경분 체크
  13. --fix --dry-run 모드

Phase 6: 생태계 통합
  14. ESLint 플러그인 (eslint-plugin-vali)
  15. npm publish 준비
```

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`vali-v02.design.md`)
2. [ ] Phase 1 테스트 보강 시작
3. [ ] Phase 2~4 신규 규칙 구현
4. [ ] Phase 5~6 자동화 및 생태계 통합

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft from v0.1 completion report + 기획서 v0.2 scope | Ryan |
