# vali

> A linter that catches what ESLint and TypeScript can't — hallucinations, slop, and over-engineering in AI-generated code.

[![npm version](https://img.shields.io/npm/v/@promptnroll/vali)](https://www.npmjs.com/package/@promptnroll/vali)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

[한국어](README.ko.md) | [中文](README.zh-CN.md)

## Why Vali?

Over 40% of enterprise code is now AI-generated. Copilot, Claude, and Cursor write code fast — but they also introduce **patterns that no existing tool catches**:

- **Hallucinated imports** — `import { magic } from 'express-validator/magic'` looks right but the module doesn't exist. TypeScript catches the type error *after* you waste 10 minutes debugging. Vali catches it instantly by checking `node_modules`.
- **Empty functions** — AI loves generating function stubs with just a `// TODO` comment. They pass linting, pass type checking, and silently break your app at runtime.
- **Over-engineering** — Ask AI for a simple CRUD endpoint and you get a Strategy Pattern + Factory + Abstract Base Class. Three files where one function would do.
- **Near-duplicate code** — AI doesn't remember what it generated 50 lines ago. You end up with `formatDate()`, `formatDateString()`, and `convertToDateFormat()` in the same file.
- **Hallucinated APIs** — `Array.prototype.groupBy()` isn't a standard method. AI thinks it is.

**ESLint checks syntax. TypeScript checks types. Vali checks whether the AI actually wrote sensible code.**

Traditional linters were designed for human mistakes — typos, style violations, unused variables. AI makes a completely different category of errors: confident-sounding code that looks clean but is fundamentally broken. Vali is purpose-built for this.

## Quick Start

```bash
npm install -D @promptnroll/vali

npx @promptnroll/vali check src/
```

Output:
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

## Features

- **10 built-in rules** — hallucinated imports, empty functions, over-engineering, duplicate code, and more
- **Auto-fix** — `--fix` to automatically clean up safe-to-fix issues
- **ESLint integration** — real-time feedback in your editor
- **Extensible** — add custom rules with `defineRule()` in 3 lines
- **GitHub Action** — SARIF reports uploaded to GitHub Security tab
- **Git-aware** — `--diff` to only check changed files

## CLI

```bash
vali check src/                          # scan directory
vali check src/ --fix                    # auto-fix safe issues
vali check src/ --diff                   # only changed files (git)
vali check src/ --format json            # JSON output
vali check src/ --format sarif           # SARIF output (GitHub Security)
vali check src/ --quiet                  # errors only
vali rules                               # list all rules
vali init                                # generate .valirc.json
```

## Configuration (.valirc.json)

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

## Rules

| ID | Name | Description | Severity | Auto-fix |
|----|------|-------------|----------|----------|
| VAL001 | hallucinated-import | Import of non-existent module | error | - |
| VAL002 | hallucinated-api | Call to non-existent API | error | - |
| VAL003 | empty-function | Function with no implementation | warning | Yes |
| VAL004 | comment-bloat | Excessive comment-to-code ratio | info | - |
| VAL005 | over-engineered | Unnecessary design patterns | warning | - |
| VAL006 | near-duplicate | Highly similar code blocks | warning | - |
| VAL007 | dead-parameter | Unused function parameter | warning | Yes |
| VAL008 | excessive-error | Unnecessary try-catch | warning | - |
| VAL009 | ai-boilerplate | AI-generated boilerplate text | warning | Yes |
| VAL010 | unused-abstraction | Abstraction used only once | info | - |

## Custom Rules

Add your own rules with `defineRule()`:

```typescript
import { defineRule } from '@promptnroll/vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: 'Disallow console.log in production code',
  check({ sourceFile, filePath }) {
    const diagnostics = [];
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() === 'console.log') {
        diagnostics.push({
          ruleId: 'CUSTOM001',
          ruleName: 'no-console-log',
          severity: 'warning',
          message: 'Do not use console.log in production',
          file: filePath,
          line: call.getStartLineNumber(),
        });
      }
    }
    return diagnostics;
  },
});
```

Register in `.valirc.json`:

```json
{
  "customRules": ["./custom-rules/*.ts"]
}
```

See [Custom Rules Guide](docs/api/custom-rules.md) for more.

## ESLint Integration

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

| Export Path | Contents |
|-------------|----------|
| `@promptnroll/vali` | defineRule, rules, config utilities |
| `@promptnroll/vali/api` | defineRule + types |
| `@promptnroll/vali/rules` | Built-in rules array |
| `@promptnroll/vali/types` | Type definitions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
