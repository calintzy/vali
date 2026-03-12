# vali

> ESLint와 TypeScript가 잡지 못하는 AI 생성 코드의 환각, 슬롭, 과잉설계를 자동 감지하는 린터

[![npm version](https://img.shields.io/npm/v/@promptnroll/vali)](https://www.npmjs.com/package/@promptnroll/vali)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

[English](README.md) | [中文](README.zh-CN.md)

## 왜 Vali인가?

기업 코드의 40% 이상이 AI로 생성되고 있습니다. Copilot, Claude, Cursor는 코드를 빠르게 작성하지만, **기존 도구가 잡지 못하는 패턴**도 함께 만들어냅니다:

- **환각 Import** — `import { magic } from 'express-validator/magic'`는 그럴듯해 보이지만, 실제로 존재하지 않는 모듈입니다. TypeScript는 타입 에러를 *나중에* 보여주고, 당신은 10분을 디버깅에 낭비합니다. Vali는 `node_modules`를 직접 확인해 즉시 잡아냅니다.
- **빈 함수** — AI는 `// TODO` 주석만 있는 함수 스텁을 즐겨 생성합니다. 린팅도 통과하고, 타입 체크도 통과하지만, 런타임에 조용히 앱을 망가뜨립니다.
- **과잉 설계** — 간단한 CRUD 엔드포인트를 요청했는데 Strategy Pattern + Factory + Abstract Base Class가 나옵니다. 함수 하나면 될 일에 파일 세 개가 생깁니다.
- **유사 중복 코드** — AI는 50줄 전에 뭘 생성했는지 기억하지 못합니다. 같은 파일에 `formatDate()`, `formatDateString()`, `convertToDateFormat()`이 공존합니다.
- **환각 API** — `Array.prototype.groupBy()`는 표준 메서드가 아닙니다. AI는 그렇다고 생각합니다.

**ESLint는 문법을 검사합니다. TypeScript는 타입을 검사합니다. Vali는 AI가 실제로 합리적인 코드를 작성했는지 검사합니다.**

기존 린터는 인간의 실수를 위해 설계되었습니다 — 오타, 스타일 위반, 미사용 변수. AI는 완전히 다른 범주의 오류를 만듭니다: 깔끔해 보이지만 근본적으로 문제가 있는, 자신감 넘치는 코드. Vali는 바로 이것을 위해 만들어졌습니다.

## 빠른 시작

```bash
npm install -D @promptnroll/vali

npx @promptnroll/vali check src/
```

출력 예시:
```
src/api/handler.ts
  ⛔ L3: Hallucinated import — 'express-validator/magic' does not exist
  ⚠️ L15-42: Over-engineered — Simple CRUD wrapped in Strategy Pattern + Factory
  ⚠️ L56: Empty function — processData() has only a TODO comment

src/utils/helpers.ts
  ⛔ L22: Hallucinated API — Array.prototype.groupBy is not standard
  ⚠️ L30-55: Near-duplicate — 92% similar to src/utils/formatters.ts:10-35

Summary: 2 files | 2 errors | 3 warnings
AI Slop Score: 34/100 (moderate — needs cleanup)
```

## 핵심 기능

- **10개 내장 규칙** — 환각 import, 빈 함수, 과잉 설계, 중복 코드 등
- **자동 수정** — `--fix` 옵션으로 안전한 문제 즉시 정리
- **ESLint 통합** — 에디터에서 실시간 피드백
- **확장 가능** — `defineRule()`로 3줄이면 커스텀 규칙 추가
- **GitHub Action** — SARIF 리포트를 GitHub Security 탭에 자동 업로드
- **Git 인식** — `--diff`로 변경된 파일만 검사

## CLI

```bash
vali check src/                          # 디렉토리 스캔
vali check src/ --fix                    # 자동 수정
vali check src/ --diff                   # 변경 파일만 (git)
vali check src/ --format json            # JSON 출력
vali check src/ --format sarif           # SARIF 출력 (GitHub Security)
vali check src/ --quiet                  # error만 출력
vali rules                               # 규칙 목록
vali init                                # .valirc.json 생성
```

## 설정 (.valirc.json)

```json
{
  "rules": {
    "VAL001": true,
    "VAL004": ["info", { "threshold": 0.4 }],
    "VAL005": ["warning", { "maxLayers": 3 }]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts"],
  "customRules": ["./custom-rules/*.ts"]
}
```

## 규칙 목록

| ID | 이름 | 설명 | 심각도 | 자동수정 |
|----|------|------|--------|---------|
| VAL001 | hallucinated-import | 존재하지 않는 모듈 import | error | - |
| VAL002 | hallucinated-api | 존재하지 않는 API 호출 | error | - |
| VAL003 | empty-function | 빈 함수/메서드 | warning | O |
| VAL004 | comment-bloat | 주석 비율 과다 | info | - |
| VAL005 | over-engineered | 과잉 설계 패턴 | warning | - |
| VAL006 | near-duplicate | 유사 중복 코드 | warning | - |
| VAL007 | dead-parameter | 사용하지 않는 매개변수 | warning | O |
| VAL008 | excessive-error | 불필요한 try-catch | warning | - |
| VAL009 | ai-boilerplate | AI 생성 보일러플레이트 | warning | O |
| VAL010 | unused-abstraction | 미사용 추상화 | info | - |

## 커스텀 규칙

`defineRule()`로 나만의 규칙을 추가하세요:

```typescript
import { defineRule } from '@promptnroll/vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: '프로덕션 코드에서 console.log 금지',
  check({ sourceFile, filePath }) {
    const diagnostics = [];
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() === 'console.log') {
        diagnostics.push({
          ruleId: 'CUSTOM001',
          ruleName: 'no-console-log',
          severity: 'warning',
          message: 'console.log를 사용하지 마세요',
          file: filePath,
          line: call.getStartLineNumber(),
        });
      }
    }
    return diagnostics;
  },
});
```

`.valirc.json`에 등록:

```json
{
  "customRules": ["./custom-rules/*.ts"]
}
```

자세한 내용은 [커스텀 규칙 가이드](docs/api/custom-rules.md)를 참고하세요.

## ESLint 통합

```bash
npm install -D @promptnroll/eslint-plugin-vali
```

`eslint.config.js` (Flat Config):

```javascript
import vali from '@promptnroll/eslint-plugin-vali';

export default [
  vali.configs.recommended,
];
```

## GitHub Action

```yaml
- name: Vali Check
  uses: calintzy/vali/action@main
  with:
    target: src/
    format: sarif
```

## API

```typescript
import { defineRule, rules, getRuleById } from '@promptnroll/vali';
import type { Rule, RuleContext, Diagnostic } from '@promptnroll/vali';
```

| Export Path | 내용 |
|-------------|------|
| `@promptnroll/vali` | defineRule, rules, config utilities |
| `@promptnroll/vali/api` | defineRule + 타입 |
| `@promptnroll/vali/rules` | 내장 규칙 배열 |
| `@promptnroll/vali/types` | 타입 정의 |

## 기여하기

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고해주세요.

## 라이선스

[MIT](LICENSE)
