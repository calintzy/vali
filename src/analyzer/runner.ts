import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Rule, RuleContext, Diagnostic, ValiConfig, FileResult } from '../types/index.js';
import type { TypeChecker } from 'ts-morph';
import { resolveRuleConfig } from '../config/index.js';
import { parseFile } from './parser.js';

export interface RunOptions {
  typeChecker?: TypeChecker;
}

export function runRules(
  filePaths: string[],
  rules: Rule[],
  config: ValiConfig,
  projectRoot: string,
  options?: RunOptions,
): FileResult[] {
  const results: FileResult[] = [];

  for (const filePath of filePaths) {
    const diagnostics = analyzeFile(filePath, rules, config, projectRoot, options);
    if (diagnostics.length > 0) {
      results.push({
        file: relative(projectRoot, filePath),
        diagnostics,
      });
    }
  }

  return results;
}

function analyzeFile(
  filePath: string,
  rules: Rule[],
  config: ValiConfig,
  projectRoot: string,
  options?: RunOptions,
): Diagnostic[] {
  const sourceFile = parseFile(filePath);
  if (!sourceFile) {
    console.warn(`vali: warning — ${filePath} 파싱 실패, 건너뜀`);
    return [];
  }

  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const relPath = relative(projectRoot, filePath);
  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    const ruleConfig = resolveRuleConfig(rule.id, rule.severity, config);
    if (!ruleConfig.enabled) continue;

    try {
      const context: RuleContext = {
        sourceFile,
        filePath,
        fileContent,
        config: ruleConfig,
        projectRoot,
        typeChecker: options?.typeChecker,
      };

      const results = rule.check(context);
      for (const d of results) {
        diagnostics.push({
          ...d,
          file: relPath,
          severity: ruleConfig.severity,
        });
      }
    } catch {
      console.warn(`vali: warning — 규칙 ${rule.id} 실행 실패 (${relPath}), 건너뜀`);
    }
  }

  return diagnostics;
}
