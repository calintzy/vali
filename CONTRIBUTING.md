# Contributing to Vali

Vali에 기여해 주셔서 감사합니다!

## 개발 환경 설정

```bash
# 요구사항: Node.js 18+
git clone https://github.com/user/vali.git
cd vali
npm install
npm run build
npm test
```

## 프로젝트 구조

```
vali/
├── src/
│   ├── api/          # Public API (defineRule)
│   ├── analyzer/     # 파일 스캐너 + 규칙 실행기
│   ├── cli/          # CLI 커맨드 + 포맷터
│   ├── config/       # 설정 로드/병합
│   ├── diff/         # Git diff 통합
│   ├── fixer/        # 자동 수정 전략
│   ├── loader/       # 커스텀 규칙 로더
│   ├── rules/        # 내장 규칙 10개
│   ├── scorer/       # Slop 점수 계산
│   └── types/        # TypeScript 타입 정의
├── packages/
│   └── eslint-plugin-vali/  # ESLint 플러그인
├── tests/            # 테스트
├── examples/         # 커스텀 규칙 예제
└── action/           # GitHub Action
```

## 새 규칙 추가하기

1. `src/rules/valXXX-kebab-name.ts` 생성
2. `Rule` 인터페이스 구현:

```typescript
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

const valXXX: Rule = {
  id: 'VALXXX',
  name: 'kebab-name',
  description: '규칙 설명',
  severity: 'warning',
  check(context: RuleContext): Diagnostic[] {
    // AST 기반 검사 로직
    return [];
  },
};

export default valXXX;
```

3. `src/rules/index.ts`에 import 추가
4. `tests/rules/valXXX.test.ts` 테스트 작성
5. `tests/fixtures/kebab-name/` 에 fixture 추가

## 테스트

```bash
# 전체 테스트
npm test

# 특정 파일
npx vitest run tests/rules/val001.test.ts

# 워치 모드
npm run test:watch
```

## 코딩 컨벤션

- TypeScript strict 모드
- ESM only (`type: "module"`)
- 규칙 ID: `VALXXX` (대문자 + 3자리)
- 커스텀 규칙 ID: 사용자 자유 (예: `CUSTOMXXX`)
- 메시지: 한국어
- 파일명: kebab-case

## PR 가이드라인

1. 기능 브랜치에서 작업
2. 모든 테스트 통과 확인 (`npm test`)
3. TypeScript 에러 없음 (`npm run lint`)
4. 커밋 메시지: 변경 내용을 명확하게 설명
