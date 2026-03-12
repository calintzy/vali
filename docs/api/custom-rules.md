# 커스텀 규칙 작성 가이드

## defineRule() API

```typescript
import { defineRule } from 'vali';

export default defineRule({
  id: string;          // 규칙 ID (필수)
  name: string;        // 규칙 이름 (필수, kebab-case)
  description?: string; // 설명 (기본: '')
  severity?: Severity;  // 'error' | 'warning' | 'info' (기본: 'warning')
  fixable?: boolean;    // 자동 수정 가능 여부 (기본: false)
  check(context: RuleContext): Diagnostic[]; // 검사 함수 (필수)
});
```

## RuleContext

```typescript
interface RuleContext {
  sourceFile: SourceFile;       // ts-morph SourceFile (AST)
  filePath: string;             // 파일 절대 경로
  fileContent: string;          // 파일 내용 문자열
  config: ResolvedRuleConfig;   // 규칙 설정 (severity, options)
  projectRoot: string;          // 프로젝트 루트 경로
  typeChecker?: TypeChecker;    // TypeScript 타입 체커 (선택)
}
```

## Diagnostic 반환 형식

```typescript
interface Diagnostic {
  ruleId: string;       // 규칙 ID (필수)
  ruleName: string;     // 규칙 이름 (필수)
  severity: Severity;   // 심각도 (필수)
  message: string;      // 진단 메시지 (필수)
  file: string;         // 파일 경로 (필수)
  line: number;         // 시작 줄 (필수)
  endLine?: number;     // 끝 줄
  column?: number;      // 시작 열
  suggestion?: string;  // 수정 제안
}
```

## .valirc.json 설정

```json
{
  "customRules": ["./custom-rules/*.ts"],
  "rules": {
    "CUSTOM001": { "severity": "error" },
    "CUSTOM002": ["warning", { "maxLines": 50 }]
  }
}
```

- `customRules`: 글로브 패턴 배열로 커스텀 규칙 파일 경로 지정
- `rules`에서 커스텀 규칙 ID로 severity 오버라이드 가능

## 예제

### no-console-log

```typescript
import { defineRule } from 'vali';
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
          suggestion: 'logger 라이브러리를 사용하세요',
        });
      }
    }
    return diagnostics;
  },
});
```

### max-function-lines

함수 줄 수 제한 — `config.options`로 커스터마이징 가능:

```typescript
import { defineRule } from 'vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM002',
  name: 'max-function-lines',
  description: '함수가 30줄을 초과하면 경고',
  check({ sourceFile, filePath, config }) {
    const maxLines = (config.options.maxLines as number) ?? 30;
    const diagnostics = [];
    const functions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];
    for (const fn of functions) {
      const lineCount = fn.getEndLineNumber() - fn.getStartLineNumber() + 1;
      if (lineCount > maxLines) {
        diagnostics.push({
          ruleId: 'CUSTOM002',
          ruleName: 'max-function-lines',
          severity: 'warning',
          message: `함수가 ${lineCount}줄입니다 (최대: ${maxLines}줄)`,
          file: filePath,
          line: fn.getStartLineNumber(),
        });
      }
    }
    return diagnostics;
  },
});
```

### no-any-cast

```typescript
import { defineRule } from 'vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM003',
  name: 'no-any-cast',
  description: 'as any 타입 단언 금지',
  severity: 'error',
  check({ sourceFile, filePath }) {
    const diagnostics = [];
    for (const asExpr of sourceFile.getDescendantsOfKind(SyntaxKind.AsExpression)) {
      if (asExpr.getTypeNode()?.getText() === 'any') {
        diagnostics.push({
          ruleId: 'CUSTOM003',
          ruleName: 'no-any-cast',
          severity: 'error',
          message: '`as any` 타입 단언은 타입 안전성을 손상시킵니다',
          file: filePath,
          line: asExpr.getStartLineNumber(),
          suggestion: '구체적인 타입이나 unknown을 사용하세요',
        });
      }
    }
    return diagnostics;
  },
});
```

## ESLint 통합

커스텀 규칙을 ESLint에서도 사용하려면:

```javascript
// eslint.config.js
import vali from 'eslint-plugin-vali';
import { addCustomRule } from 'eslint-plugin-vali';
import myRule from './custom-rules/my-rule.ts';

addCustomRule(myRule);

export default [vali.configs.recommended];
```
