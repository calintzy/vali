# vali

> 自动检测 AI 生成代码中的幻觉、冗余和过度设计 —— ESLint 和 TypeScript 无法发现的问题

[![npm version](https://img.shields.io/npm/v/@promptnroll/vali)](https://www.npmjs.com/package/@promptnroll/vali)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

[English](README.md) | [한국어](README.ko.md)

## 为什么需要 Vali？

如今超过 40% 的企业代码由 AI 生成。Copilot、Claude、Cursor 写代码很快，但它们也会引入**现有工具无法捕获的问题**：

- **幻觉 Import** —— `import { magic } from 'express-validator/magic'` 看起来合理，但这个模块根本不存在。TypeScript 会*事后*报类型错误，而你已经浪费了 10 分钟调试。Vali 直接检查 `node_modules`，立即发现问题。
- **空函数** —— AI 喜欢生成只有 `// TODO` 注释的函数桩。它们通过了 lint 检查，通过了类型检查，然后在运行时悄悄让你的应用崩溃。
- **过度设计** —— 你只要一个简单的 CRUD 接口，AI 却给你 Strategy Pattern + Factory + Abstract Base Class。一个函数就能搞定的事情，变成了三个文件。
- **近似重复代码** —— AI 不记得 50 行前它生成了什么。你会在同一个文件里看到 `formatDate()`、`formatDateString()` 和 `convertToDateFormat()` 共存。
- **幻觉 API** —— `Array.prototype.groupBy()` 不是标准方法。AI 以为它是。

**ESLint 检查语法。TypeScript 检查类型。Vali 检查 AI 是否真的写了合理的代码。**

传统 linter 是为人类的错误设计的 —— 拼写错误、风格违规、未使用变量。AI 会制造完全不同类型的错误：看起来干净整洁但根本上有问题的、充满自信的代码。Vali 正是为此而生。

## 快速开始

```bash
npm install -D @promptnroll/vali

npx @promptnroll/vali check src/
```

输出示例：
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

## 核心功能

- **10 条内置规则** —— 幻觉 import、空函数、过度设计、重复代码等
- **自动修复** —— `--fix` 选项自动清理安全可修复的问题
- **ESLint 集成** —— 编辑器内实时反馈
- **可扩展** —— 使用 `defineRule()` 三行代码添加自定义规则
- **GitHub Action** —— SARIF 报告自动上传至 GitHub Security 标签页
- **Git 感知** —— `--diff` 仅检查已更改的文件

## CLI

```bash
vali check src/                          # 扫描目录
vali check src/ --fix                    # 自动修复
vali check src/ --diff                   # 仅已更改文件 (git)
vali check src/ --format json            # JSON 输出
vali check src/ --format sarif           # SARIF 输出 (GitHub Security)
vali check src/ --quiet                  # 仅显示错误
vali rules                               # 列出所有规则
vali init                                # 生成 .valirc.json
```

## 配置 (.valirc.json)

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

## 规则列表

| ID | 名称 | 描述 | 严重度 | 自动修复 |
|----|------|------|--------|----------|
| VAL001 | hallucinated-import | 导入不存在的模块 | error | - |
| VAL002 | hallucinated-api | 调用不存在的 API | error | - |
| VAL003 | empty-function | 空函数/方法 | warning | 是 |
| VAL004 | comment-bloat | 注释比例过高 | info | - |
| VAL005 | over-engineered | 过度设计模式 | warning | - |
| VAL006 | near-duplicate | 高度相似的代码块 | warning | - |
| VAL007 | dead-parameter | 未使用的函数参数 | warning | 是 |
| VAL008 | excessive-error | 不必要的 try-catch | warning | - |
| VAL009 | ai-boilerplate | AI 生成的样板文本 | warning | 是 |
| VAL010 | unused-abstraction | 仅使用一次的抽象 | info | - |

## 自定义规则

使用 `defineRule()` 添加自定义规则：

```typescript
import { defineRule } from '@promptnroll/vali';
import { SyntaxKind } from 'ts-morph';

export default defineRule({
  id: 'CUSTOM001',
  name: 'no-console-log',
  description: '禁止在生产代码中使用 console.log',
  check({ sourceFile, filePath }) {
    const diagnostics = [];
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() === 'console.log') {
        diagnostics.push({
          ruleId: 'CUSTOM001',
          ruleName: 'no-console-log',
          severity: 'warning',
          message: '请勿使用 console.log',
          file: filePath,
          line: call.getStartLineNumber(),
        });
      }
    }
    return diagnostics;
  },
});
```

在 `.valirc.json` 中注册：

```json
{
  "customRules": ["./custom-rules/*.ts"]
}
```

详见 [自定义规则指南](docs/api/custom-rules.md)。

## ESLint 集成

```bash
npm install -D @promptnroll/eslint-plugin-vali
```

`eslint.config.js` (Flat Config)：

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

| 导出路径 | 内容 |
|----------|------|
| `@promptnroll/vali` | defineRule, rules, 配置工具 |
| `@promptnroll/vali/api` | defineRule + 类型 |
| `@promptnroll/vali/rules` | 内置规则数组 |
| `@promptnroll/vali/types` | 类型定义 |

## 贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
