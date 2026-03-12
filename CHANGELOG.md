# Changelog

## [0.4.0] - 2026-03-11

### Added
- 커스텀 규칙 API: `defineRule()` 헬퍼 함수
- 커스텀 규칙 로더: `.valirc.json`의 `customRules` 필드로 글로브 패턴 지정
- 커스텀 규칙 예제 3개 (`examples/`)
- npm publish 파이프라인 (`exports`, `prepublishOnly`, `publish:dryrun`)
- `package.json` exports 필드 (4개 진입점: `.`, `./api`, `./rules`, `./types`)
- 루트 진입점 `src/index.ts` (Public API)
- tsup 멀티 엔트리 빌드 설정 (CLI + Library)
- README.md 전면 재작성
- CONTRIBUTING.md 기여 가이드
- API 문서 (`docs/api/custom-rules.md`, `docs/api/configuration.md`)
- VAL010 cross-file 참조 카운트 (`countCrossFileReferences`)
- SARIF `helpUri` 필드 추가

### Changed
- ESLint 플러그인 import 경로: 상대 경로 → 패키지 경로 (`vali/rules`, `vali/types`)
- ESLint 플러그인 `vali`를 `peerDependencies`로 이동
- ESLint 플러그인에 `addCustomRule()` API 추가

### Fixed
- VAL008 `impossibleError` fixture 추가
- fixer.test.ts 테스트 커버리지 확대 (5개)

## [0.3.0] - 2026-03-11

### Added
- SARIF v2.1 출력 포맷 (`--format sarif`) — GitHub Security 탭 연동
- ESLint 플러그인 (`eslint-plugin-vali`) — 에디터 실시간 감지
  - `createESLintRule()` 어댑터로 10개 규칙 래핑
  - `recommended` preset config
  - ESLint v8/v9 호환
- GitHub Action (`vali-action`) — CI/CD 자동화
  - PR 자동 체크 + 코멘트 게시
  - SARIF 업로드 지원
- VAL005: `unnecessaryStrategy` 패턴 (Strategy/Handler/Policy 감지)
- VAL007: interface 구현 메서드 skip + 콜백 시그니처 패턴 skip
- VAL008: `impossibleError` 패턴 (TypeChecker 기반)
- VAL010: abstract class 감지 + 제네릭 utility type skip
- Fixer/Diff 독립 테스트
- 성능 벤치마크 (`tests/benchmarks/scan.bench.ts`)
- 누락 fixture 3개 추가 (any-type, single-impl, empty-catch)

### Changed
- `CheckOptions.format` 타입에 `'sarif'` 추가
- CLI `--format` 옵션에 `sarif` 선택지 추가

## [0.2.0] - 2026-03-11

### Added
- 6개 신규 규칙 (VAL005~VAL010)
- Fixer 엔진 + 3개 자동 수정 전략
- Git diff 모드 (`--diff`)
- JSON 출력 포맷
- `.valirc.json` 설정 파일 지원

## [0.1.0] - 2026-03-11

### Added
- 초기 릴리스
- 4개 기본 규칙 (VAL001~VAL004)
- CLI (`vali check`, `vali init`, `vali rules`)
- Terminal 출력 포맷
- AI Slop Score 계산
