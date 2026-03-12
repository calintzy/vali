# Vali v0.4 Planning Document

> **Summary**: 커스텀 규칙 API 공개, npm 배포 완성, v0.3 잔여 Gap 해소, README/문서 정비로 오픈소스 출시 준비
>
> **Project**: Vali (Validate AI)
> **Version**: 0.4.0
> **Author**: Ryan
> **Date**: 2026-03-11
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v0.3에서 ESLint 플러그인/GitHub Action/SARIF를 완성했으나, 사용자가 자체 규칙을 추가할 수 없고, npm에 미배포 상태이며, ESLint 플러그인이 상대 경로를 사용하여 외부에서 설치 불가, README/문서 부재로 오픈소스 채택 불가능 |
| **Solution** | 커스텀 규칙 작성 API(`defineRule()`) 공개, npm publish 파이프라인 완성(vali + eslint-plugin-vali), ESLint 플러그인 import 경로 정리, v0.3 잔여 Gap 4개 해소, README.md + 문서 사이트 정비 |
| **Function/UX Effect** | `defineRule({ id, check })` 3줄로 사용자 규칙 추가, `npx vali check src/` 즉시 사용 가능, `npm i eslint-plugin-vali`로 에디터 통합, README에서 설치→사용→확장까지 원스톱 가이드 |
| **Core Value** | "도구 완성 → 오픈소스 출시" — 내부 도구에서 **커뮤니티 참여 가능한 오픈소스 프로젝트**로 전환, npm 생태계 진입으로 사용자 확보 시작 |

---

## 1. Overview

### 1.1 Purpose

v0.3까지 완성된 10개 규칙 + ESLint 플러그인 + GitHub Action + SARIF를 기반으로, 커스텀 규칙 API를 공개하고 npm 배포를 완성하여 오픈소스 출시 가능한 상태로 만든다. 기획서 v0.3 잔여 항목(커스텀 규칙 API)과 v0.3 PDCA Gap을 해소한다.

### 1.2 Background

- v0.1 PDCA 완료: Match Rate 95%, 기본 CLI + 4개 규칙
- v0.2 PDCA 완료: Match Rate 94.6%, 10개 규칙 + Fixer + Git diff
- v0.3 PDCA 완료: Match Rate 95.5%, ESLint 플러그인 + GitHub Action + SARIF
- 기획서 v0.3 잔여: 커스텀 규칙 API (VS Code 확장은 ESLint 기반으로 이미 가능)
- v0.3 Gap Backlog: cross-file 참조, ESLint import 경로, fixer 테스트, impossibleError fixture
- npm 미배포: 외부 사용자가 설치 불가

### 1.3 Related Documents

- 기획서: `기획서.md`
- v0.3 Plan: `docs/archive/2026-03/vali-v03/vali-v03.plan.md`
- v0.3 Report: `docs/archive/2026-03/vali-v03/vali-v03.report.md`

---

## 2. Scope

### 2.1 In Scope (v0.4)

**커스텀 규칙 API (기획서 v0.3 잔여)**
- [ ] Rule 인터페이스 공개 (`defineRule()` 헬퍼)
- [ ] 커스텀 규칙 로드 시스템 (`.valirc.json`의 `customRules` 필드)
- [ ] 커스텀 규칙 작성 가이드 문서
- [ ] 커스텀 규칙 예제 3개 제공

**npm 배포 완성**
- [ ] ESLint 플러그인 import 경로 정리 (상대 경로 → `from 'vali'`)
- [ ] ESLint 플러그인 package.json 의존성 정리 (`vali: ^0.4.0`)
- [ ] tsup 빌드 설정 정리 (루트 + eslint-plugin)
- [ ] npm publish 스크립트 (vali + eslint-plugin-vali 동시 배포)
- [ ] package.json exports 필드 설정

**v0.3 잔여 Gap 해소**
- [ ] VAL010 `countCrossFileReferences()` 구현
- [ ] VAL008 impossibleError fixture 추가
- [ ] fixer.test.ts 2개 케이스 추가 (Design 기준 5+ 충족)
- [ ] SARIF helpUri 필드 추가

**문서 & 출시 준비**
- [ ] README.md 전면 재작성 (설치→사용→설정→확장→기여)
- [ ] CONTRIBUTING.md 작성
- [ ] API 문서 (규칙 인터페이스, 설정 옵션)
- [ ] 데모 GIF/스크린샷 제작

### 2.2 Out of Scope (v0.5+)

- Python 지원 (tree-sitter 통합 — 별도 PDCA 사이클)
- VS Code 확장 (독립 확장 — ESLint 통합으로 현재도 사용 가능)
- AI 기반 고급 패턴 감지 (v1.0)
- 팀별 대시보드 (v1.0)
- 웹 playground (v1.0)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `defineRule()` 헬퍼로 규칙 정의 | High | Pending |
| FR-02 | `.valirc.json`에서 `customRules` 경로 지정 | High | Pending |
| FR-03 | 커스텀 규칙 자동 ESLint 래핑 | High | Pending |
| FR-04 | 커스텀 규칙 예제 3개 (no-console-log, max-function-lines, no-any-cast) | Medium | Pending |
| FR-05 | ESLint 플러그인 import `from 'vali'` 전환 | High | Pending |
| FR-06 | npm publish: vali@0.4.0 + eslint-plugin-vali@0.4.0 | High | Pending |
| FR-07 | package.json `exports` 필드 설정 | High | Pending |
| FR-08 | tsup.config.ts 루트 + ESLint 플러그인 | Medium | Pending |
| FR-09 | VAL010 cross-file 참조 (`countCrossFileReferences`) | Medium | Pending |
| FR-10 | VAL008 impossibleError fixture | Low | Pending |
| FR-11 | fixer.test.ts 2개 추가 케이스 | Low | Pending |
| FR-12 | SARIF helpUri 필드 추가 | Low | Pending |
| FR-13 | README.md 전면 재작성 | High | Pending |
| FR-14 | CONTRIBUTING.md | Medium | Pending |
| FR-15 | API 문서 (docs/api/) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Compatibility | npm publish 후 `npx vali check` 정상 동작 | E2E 검증 |
| Compatibility | `npm i eslint-plugin-vali` 후 ESLint 연동 | ESLint 통합 테스트 |
| Performance | 커스텀 규칙 포함 1,000파일 15초 이내 | 벤치마크 |
| DX | defineRule 3줄로 규칙 생성 가능 | 사용자 테스트 |
| Documentation | README로 5분 내 첫 사용 가능 | 독립 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `defineRule()` API 정상 동작 + 테스트
- [ ] 커스텀 규칙 3개 예제 동작 확인
- [ ] ESLint 플러그인 `from 'vali'` import로 전환 완료
- [ ] npm publish dry-run 성공 (vali + eslint-plugin-vali)
- [ ] v0.3 Gap 4개 전부 해소
- [ ] README.md 완성
- [ ] 모든 테스트 통과
- [ ] TypeScript strict 0 errors

### 4.2 Quality Criteria

- [ ] 테스트 70개 이상 (현재 61 + 신규 9+)
- [ ] TypeScript strict 0 errors
- [ ] npm pack으로 패키지 내용 검증
- [ ] 크로스 플랫폼 테스트 (Node 18/20/22)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 커스텀 규칙 API 설계 복잡도 | High | Medium | 최소 인터페이스 (defineRule만), 내부 확장은 후속 |
| npm publish 시 빌드 깨짐 | Medium | Medium | dry-run 먼저, CI에서 검증 |
| cross-file 참조 성능 영향 | Medium | Medium | lazy evaluation + 파일 수 제한 (기본 100) |
| ESLint 플러그인 import 변경 시 깨짐 | High | Low | npm workspaces link로 개발/테스트 |
| README 가독성 | Medium | Low | 경쟁 프로젝트 참고, 데모 GIF 포함 |

---

## 6. Architecture Considerations

### 6.1 Project Level

Dynamic (v0.1~v0.3과 동일)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 커스텀 규칙 API | Class 기반 / 함수 기반 | 함수 기반 (`defineRule()`) | ESLint 규칙 스타일과 유사, 진입장벽 낮음 |
| 커스텀 규칙 로드 | 동적 import / require | 동적 import (ESM) | ESM 기반 프로젝트, type: module |
| 빌드 출력 | dist/ 단일 / dist/cjs + dist/esm | dist/ ESM 단일 | type: module 프로젝트, CJS 불필요 |
| 문서 | README만 / 별도 docs/ | README + docs/api/ | 빠른 시작은 README, 상세는 docs/ |
| cross-file scope | 전체 프로젝트 / 제한적 | 제한적 (최대 100파일) | 성능 보장, 대규모 프로젝트 지원 |

### 6.3 커스텀 규칙 API 설계

```typescript
// 사용자가 작성하는 커스텀 규칙 (custom-rules/no-console-log.ts)
import { defineRule } from 'vali';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: '프로덕션 코드에서 console.log 금지',
  severity: 'warning',
  check({ sourceFile, filePath }) {
    const diagnostics = [];
    // ts-morph AST 기반 검사 로직
    return diagnostics;
  },
});
```

```json
// .valirc.json
{
  "customRules": ["./custom-rules/*.ts"],
  "rules": {
    "CUSTOM001": { "severity": "error" }
  }
}
```

### 6.4 v0.4 폴더 구조 확장

```
vali/
├── src/
│   ├── api/                          # NEW: Public API
│   │   ├── define-rule.ts            # defineRule() 헬퍼
│   │   └── index.ts                  # Public exports
│   ├── loader/                       # NEW: 커스텀 규칙 로더
│   │   └── custom-rule-loader.ts
│   └── ...
├── packages/
│   └── eslint-plugin-vali/
│       └── src/                      # import 경로 정리
├── examples/                         # NEW: 커스텀 규칙 예제
│   ├── no-console-log.ts
│   ├── max-function-lines.ts
│   └── no-any-cast.ts
├── docs/
│   └── api/                          # NEW: API 문서
│       ├── custom-rules.md
│       └── configuration.md
├── tsup.config.ts                    # NEW: 루트 빌드 설정
├── README.md                         # 전면 재작성
├── CONTRIBUTING.md                   # NEW
└── package.json                      # exports 필드 추가
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (v0.1~v0.3 확립)

- [x] 규칙 파일: `valXXX-kebab-name.ts`
- [x] 규칙 ID: `VALXXX` (대문자 + 3자리), 커스텀: `CUSTOMXXX`
- [x] Rule 인터페이스: `{ id, name, description, severity, check(), fixable? }`
- [x] ESLint 어댑터: `createESLintRule(valiRule)`

### 7.2 v0.4 추가 컨벤션

| Category | Rule | Priority |
|----------|------|:--------:|
| **Public API** | `defineRule()` 단일 진입점 | High |
| **커스텀 규칙 ID** | `CUSTOMXXX` (사용자 자유) | Medium |
| **exports** | `vali`, `vali/api`, `vali/types` | High |
| **문서** | JSDoc + docs/api/ markdown | Medium |

---

## 8. Implementation Priority

### 8.1 Phase 순서

```
Phase 1: 커스텀 규칙 API (핵심)
  1. defineRule() 헬퍼 + Rule 타입 공개
  2. 커스텀 규칙 로더 (dynamic import)
  3. .valirc.json customRules 필드 처리
  4. 커스텀 규칙 ESLint 자동 래핑
  5. 커스텀 규칙 예제 3개
  6. 커스텀 규칙 테스트

Phase 2: npm 배포 정비
  7. package.json exports 필드
  8. tsup.config.ts (루트 + ESLint plugin)
  9. ESLint 플러그인 import 경로 전환
  10. ESLint 플러그인 deps 정리
  11. npm publish dry-run 검증

Phase 3: v0.3 Gap 해소
  12. VAL010 countCrossFileReferences 구현
  13. VAL008 impossibleError fixture
  14. fixer.test.ts 2개 케이스 추가
  15. SARIF helpUri 필드

Phase 4: 문서 & 출시
  16. README.md 전면 재작성
  17. CONTRIBUTING.md
  18. docs/api/custom-rules.md
  19. docs/api/configuration.md
  20. CHANGELOG.md v0.4 추가
```

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`vali-v04.design.md`)
2. [ ] Phase 1 커스텀 규칙 API 구현
3. [ ] Phase 2 npm 배포 정비
4. [ ] Phase 3~4 Gap 해소 + 문서

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-11 | Initial draft from 기획서 + v0.3 backlog | Ryan |
