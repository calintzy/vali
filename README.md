# vali

> AI 생성 코드의 환각, 슬롭, 과잉설계를 자동 감지하는 린터

[![npm version](https://img.shields.io/npm/v/vali)](https://www.npmjs.com/package/vali)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Copilot, Claude, Cursor 등 AI가 생성한 코드에서 흔히 발생하는 문제를 AST 기반으로 정적 분석합니다.

## 핵심 기능

- **10개 내장 규칙** — 환각 import, 빈 함수, 과잉 설계, 중복 코드 등
- **자동 수정** — `--fix` 옵션으로 즉시 코드 정리
- **ESLint 통합** — 에디터에서 실시간 피드백
- **확장 가능** — `defineRule()`로 커스텀 규칙 추가
- **GitHub Action** — CI/CD에서 SARIF 리포트 자동 업로드

## Quick Start

```bash
# 설치
npm install -D @promptnroll/vali

# 검사 실행
npx @promptnroll/vali check src/

# 자동 수정
npx @promptnroll/vali check src/ --fix
```

## 사용법

### CLI

```bash
# 기본 검사
vali check src/

# JSON 출력
vali check src/ --format json

# SARIF 출력 (GitHub Security 탭 연동)
vali check src/ --format sarif > results.sarif

# error만 출력
vali check src/ --quiet

# Git 변경 파일만 검사
vali check src/ --diff

# 규칙 목록 확인
vali rules

# 설정 초기화
vali init
```

### 설정 (.valirc.json)

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

### 커스텀 규칙

`defineRule()`로 3줄이면 규칙을 추가할 수 있습니다:

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

### ESLint 통합

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

### GitHub Action

```yaml
- name: Vali Check
  uses: ./action
  with:
    target: src/
    format: sarif
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
