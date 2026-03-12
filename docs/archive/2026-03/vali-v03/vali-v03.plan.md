# Vali v0.3 Planning Document

> **Summary**: ESLint 플러그인, GitHub Action, v0.2 규칙 Gap 해소, SARIF 출력으로 CI/CD 통합 및 생태계 확장
>
> **Project**: Vali (Validate AI)
> **Version**: 0.3.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v0.2에서 10개 규칙과 자동 수정을 완성했으나, ESLint/에디터 통합이 없어 기존 워크플로우에 삽입이 어렵고, GitHub Action이 없어 CI/CD 자동화가 불가하며, 일부 규칙의 미구현 패턴(4개)으로 false positive 위험이 존재 |
| **Solution** | ESLint 플러그인(eslint-plugin-vali)으로 에디터 실시간 표시, GitHub Action으로 PR 자동 체크, SARIF 출력으로 GitHub Security 탭 통합, v0.2 미구현 규칙 패턴 4개 보완 |
| **Function/UX Effect** | `npx eslint --plugin vali src/`로 에디터 실시간 감지, GitHub PR에 자동 코멘트, SARIF로 Security 탭에 결과 표시, false positive 감소로 신뢰도 향상 |
| **Core Value** | "설치 → CI 통합 → 에디터 표시" 원클릭 채택 경로 완성으로, 개인 도구에서 팀 표준 도구로 격상 |

---

## 1. Overview

### 1.1 Purpose

v0.2에서 완성된 10개 규칙 + 자동 수정 엔진을 기반으로, CI/CD 파이프라인과 에디터에 통합하여 Vali를 팀 수준 도구로 확장한다. 기획서 v0.3 로드맵("CI/CD 통합")을 충실히 이행한다.

### 1.2 Background

- v0.1 PDCA 완료: Match Rate 95%, 기본 CLI + 4개 규칙
- v0.2 PDCA 완료: Match Rate 94.6%, 10개 규칙 + Fixer + Git diff
- v0.2에서 ESLint 플러그인 v0.3으로 연기
- v0.2 Gap Analysis: 4개 규칙에서 일부 패턴 미구현 (false positive 위험)
- 기획서 v0.3: GitHub Action, PR 코멘트, VS Code 확장, 커스텀 규칙 API

### 1.3 Related Documents

- 기획서: `기획서.md`
- v0.2 Plan: `docs/01-plan/features/vali-v02.plan.md`
- v0.2 Design: `docs/02-design/features/vali-v02.design.md`
- v0.2 Analysis: `docs/03-analysis/vali-v02.analysis.md`
- v0.2 Report: `docs/04-report/features/vali-v02.report.md`

---

## 2. Scope

### 2.1 In Scope (v0.3)

**CI/CD 통합 (기획서 v0.3 핵심)**
- [ ] ESLint 플러그인 (`eslint-plugin-vali`) — v0.2에서 연기된 핵심 항목
- [ ] GitHub Action (`vali-action`) — CI 자동화
- [ ] SARIF 출력 포맷 (`--format sarif`) — GitHub Security 탭 연동
- [ ] PR 코멘트 연동 — GitHub Action에서 결과를 PR에 자동 게시

**규칙 완성도 보강 (v0.2 Gap 해소)**
- [ ] VAL005: `unnecessaryStrategy` 패턴 추가
- [ ] VAL007: interface 구현 메서드 skip + callback signature skip
- [ ] VAL008: `impossibleError` 패턴 추가
- [ ] VAL010: abstract class 감지 + generic utility type skip + cross-file reference

**품질 & 배포**
- [ ] Fixer/Diff 독립 테스트 파일 분리
- [ ] 3개 누락 fixture 추가 (any-type.ts, single-impl.ts, empty-catch.ts)
- [ ] 성능 벤치마크 (1,000파일 / 5,000파일)
- [ ] README.md v0.3 업데이트
- [ ] npm publish 준비 (CHANGELOG.md)

### 2.2 Out of Scope (v0.4+)

- Python 지원 (tree-sitter 통합 — 별도 PDCA 사이클 필요)
- VS Code 확장 (ESLint 플러그인 기반으로 v0.4에서 독립 확장 제공)
- 커스텀 규칙 작성 API (v0.4 — Rule 인터페이스 공개 + 문서화)
- AI 기반 고급 패턴 감지 (v1.0)
- 팀별 대시보드 (v1.0)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | ESLint 플러그인: Vali 10개 규칙을 ESLint 규칙으로 래핑 | High | Pending |
| FR-02 | ESLint 플러그인: `recommended` preset config 제공 | High | Pending |
| FR-03 | ESLint 플러그인: ESLint v9 flat config 지원 | High | Pending |
| FR-04 | ESLint 플러그인: ESLint v8 legacy config 지원 | Medium | Pending |
| FR-05 | GitHub Action: `uses: vali-action` 으로 PR 시 자동 체크 | High | Pending |
| FR-06 | GitHub Action: 결과를 PR 코멘트로 게시 | Medium | Pending |
| FR-07 | GitHub Action: exit code 1 (error 발견 시) / 0 (clean) | High | Pending |
| FR-08 | SARIF 출력: `--format sarif` 옵션으로 SARIF v2.1 JSON 출력 | Medium | Pending |
| FR-09 | SARIF → GitHub Security: `github/codeql-action/upload-sarif` 호환 | Medium | Pending |
| FR-10 | VAL005 `unnecessaryStrategy` 패턴 추가 | Low | Pending |
| FR-11 | VAL007 interface 구현 메서드 skip + callback signature skip | Low | Pending |
| FR-12 | VAL008 `impossibleError` 패턴 추가 (TypeChecker 기반) | Low | Pending |
| FR-13 | VAL010 abstract class 감지 + generic utility skip + cross-file ref | Medium | Pending |
| FR-14 | Fixer/Diff 독립 테스트 파일 | Low | Pending |
| FR-15 | 3개 누락 fixture 추가 | Low | Pending |
| FR-16 | 성능 벤치마크 테스트 | Low | Pending |
| FR-17 | README.md + CHANGELOG.md 업데이트 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 1,000 파일 스캔 15초 이내 (ESLint 모드 포함) | 벤치마크 테스트 |
| Compatibility | ESLint v8/v9 dual 지원 | CI 매트릭스 |
| Compatibility | GitHub Action: ubuntu-latest, node 18/20/22 | CI 매트릭스 |
| SARIF | SARIF v2.1.0 스키마 준수 | 스키마 검증 |
| Size | GitHub Action Docker image < 50MB | 이미지 빌드 |
| Reliability | false positive rate 5% 이하 (v0.2의 ~5% 유지) | 오픈소스 벤치마크 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] ESLint 플러그인 정상 동작 (10개 규칙 래핑)
- [ ] GitHub Action 정상 동작 (PR 체크 + 코멘트)
- [ ] SARIF 출력 스키마 검증 통과
- [ ] v0.2 규칙 Gap 4개 전부 해소
- [ ] 모든 테스트 통과
- [ ] 성능 벤치마크 기준 충족
- [ ] npm publish 완료 (vali + eslint-plugin-vali)

### 4.2 Quality Criteria

- [ ] TypeScript strict 모드 에러 0건
- [ ] 테스트 커버리지 85% 이상
- [ ] ESLint v8 + v9 호환 테스트 통과
- [ ] SARIF v2.1.0 스키마 검증 통과
- [ ] 벤치마크: 1,000파일 15초 이내

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ESLint v8/v9 호환성 복잡도 | High | Medium | flat config 우선, legacy는 어댑터 패턴으로 래핑 |
| GitHub Action 빌드 크기 | Medium | Low | Node.js composite action (Docker 불필요) |
| SARIF 스키마 복잡도 | Medium | Low | 최소 필수 필드만 구현, sarif-sdk 참조 |
| VAL008 impossibleError false positive | Medium | High | TypeChecker 필수, 타입 추론 실패 시 skip |
| VAL010 cross-file 성능 영향 | High | Medium | Lazy evaluation, 캐싱, 파일 수 제한 |
| monorepo 패키지 관리 | Medium | Medium | 단일 repo에 packages/ 구조, npm workspaces |

---

## 6. Architecture Considerations

### 6.1 Project Level

Dynamic (v0.1~v0.2와 동일)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| ESLint 플러그인 구조 | 별도 repo / monorepo packages/ | monorepo `packages/` | 코드 공유, 단일 CI, 버전 동기화 |
| ESLint 규칙 래핑 | 직접 호출 / 어댑터 패턴 | 어댑터 패턴 | Vali Rule → ESLint Rule 변환 재사용 |
| GitHub Action 타입 | Docker / composite / JavaScript | composite (Node.js) | 빌드 불필요, 빠른 시작 |
| SARIF 생성 | 직접 구현 / sarif 라이브러리 | 직접 구현 | 최소 필드만 필요, 외부 의존성 제거 |
| cross-file reference | TypeChecker.findReferences / 자체 구현 | ts-morph findReferencesAsNodes | ts-morph 내장, 정확한 참조 추적 |
| 패키지 관리 | npm workspaces / 수동 | npm workspaces | 의존성 자동 관리, 스크립트 통합 |

### 6.3 v0.3 폴더 구조 확장

```
vali/
├── packages/
│   └── eslint-plugin-vali/         # NEW: ESLint 플러그인
│       ├── src/
│       │   ├── index.ts            # 플러그인 진입점
│       │   ├── adapter.ts          # Vali Rule → ESLint Rule 어댑터
│       │   └── configs/
│       │       └── recommended.ts  # recommended preset
│       ├── tests/
│       │   └── adapter.test.ts     # 어댑터 테스트
│       ├── package.json
│       └── tsconfig.json
├── action/                         # NEW: GitHub Action
│   ├── action.yml                  # Action 메타데이터
│   ├── src/
│   │   ├── main.ts                 # Action 진입점
│   │   └── comment.ts              # PR 코멘트 생성
│   └── dist/
│       └── index.js                # 번들 (ncc)
├── src/
│   ├── cli/
│   │   └── formatters/
│       │   ├── terminal.ts
│       │   ├── json.ts
│       │   └── sarif.ts            # NEW: SARIF v2.1 포매터
│   ├── rules/                      # 4개 규칙 패턴 보강
│   └── ...
├── tests/
│   ├── fixer.test.ts               # NEW: Fixer 독립 테스트
│   ├── diff.test.ts                # NEW: Diff 독립 테스트
│   └── benchmarks/                 # NEW: 성능 벤치마크
│       └── scan.bench.ts
└── package.json                    # npm workspaces 설정
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (v0.1~v0.2 확립)

- [x] 규칙 파일: `valXXX-kebab-name.ts`
- [x] Fix 전략 파일: `fix-kebab-name.ts`
- [x] 규칙 ID: `VALXXX` (대문자 + 3자리)
- [x] 함수: camelCase, 타입: PascalCase, 상수: UPPER_SNAKE_CASE
- [x] Rule 인터페이스: `{ id, name, description, severity, check(), fixable? }`

### 7.2 v0.3 추가 컨벤션

| Category | Rule | Priority |
|----------|------|:--------:|
| **ESLint 규칙명** | `vali/rule-name` (kebab-case) | High |
| **ESLint 어댑터** | `createESLintRule(valiRule)` 패턴 | High |
| **SARIF 포매터** | `formatSarif(results): SarifLog` 순수 함수 | High |
| **Action 빌드** | `@vercel/ncc` 로 단일 파일 번들 | Medium |
| **벤치마크** | `*.bench.ts` vitest bench 활용 | Low |

---

## 8. Implementation Priority

### 8.1 Phase 순서

```
Phase 1: v0.2 Gap 해소 + 테스트 보강 (규칙 완성도)
  1. VAL005 unnecessaryStrategy 패턴 추가
  2. VAL007 interface/callback skip 강화
  3. VAL008 impossibleError 패턴 추가
  4. VAL010 abstract class + generic utility skip + cross-file ref
  5. 3개 누락 fixture 추가
  6. Fixer/Diff 독립 테스트

Phase 2: SARIF 출력 포맷
  7. SARIF v2.1 포매터 (src/cli/formatters/sarif.ts)
  8. --format sarif CLI 옵션
  9. SARIF 스키마 검증 테스트

Phase 3: ESLint 플러그인
  10. packages/eslint-plugin-vali 구조 설정
  11. Vali Rule → ESLint Rule 어댑터 (adapter.ts)
  12. 10개 규칙 래핑
  13. recommended config preset
  14. ESLint v8/v9 호환 테스트

Phase 4: GitHub Action
  15. action/action.yml 메타데이터
  16. Action main.ts (vali check 실행)
  17. PR 코멘트 생성 (comment.ts)
  18. ncc 번들 빌드

Phase 5: 품질 & 배포
  19. 성능 벤치마크
  20. README.md + CHANGELOG.md 업데이트
  21. npm publish 준비 (vali + eslint-plugin-vali)
```

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`vali-v03.design.md`)
2. [ ] Phase 1 규칙 Gap 해소 시작
3. [ ] Phase 2~3 SARIF + ESLint 플러그인 구현
4. [ ] Phase 4~5 GitHub Action + 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft from v0.2 report backlog + 기획서 v0.3 scope | Ryan |
