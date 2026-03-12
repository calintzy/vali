import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import type { CheckOptions, ScanResult, FixResult, RuleContext } from '../../types/index.js';
import { loadConfig } from '../../config/index.js';
import { scanFiles } from '../../analyzer/scanner.js';
import { runRules } from '../../analyzer/runner.js';
import { rules as builtinRules } from '../../rules/index.js';
import { loadCustomRules } from '../../loader/custom-rule-loader.js';
import type { Rule } from '../../types/index.js';
import { calculateSlopScore } from '../../scorer/index.js';
import { formatTerminal, formatFixResult } from '../formatters/terminal.js';
import { formatJson } from '../formatters/json.js';
import { formatSarif } from '../formatters/sarif.js';
import { getChangedFiles } from '../../diff/index.js';
import { createFixer } from '../../fixer/strategies/index.js';
import { parseFile } from '../../analyzer/parser.js';
import { resolveRuleConfig } from '../../config/index.js';

export async function checkCommand(
  targetPath: string,
  options: CheckOptions,
): Promise<void> {
  const projectRoot = process.cwd();
  const absTarget = resolve(projectRoot, targetPath);

  if (!existsSync(absTarget)) {
    console.error(`vali: error — '${targetPath}' 경로가 존재하지 않습니다`);
    process.exit(2);
  }

  const config = loadConfig(projectRoot, options.config !== '.valirc.json' ? options.config : undefined);
  let files = await scanFiles(targetPath, projectRoot, config);

  // --diff: 변경 파일만 필터링
  if (options.diff) {
    const changedFiles = getChangedFiles(projectRoot, { base: options.diffBase });
    if (changedFiles.length > 0) {
      const changedSet = new Set(changedFiles.map(f => resolve(projectRoot, f)));
      files = files.filter(f => changedSet.has(f));
    }
  }

  if (files.length === 0) {
    console.log('vali: info — 검사할 파일이 없습니다');
    return;
  }

  // 커스텀 규칙 로드
  let allRules: Rule[] = [...builtinRules];
  if (config.customRules && config.customRules.length > 0) {
    const { rules: customRules, errors } = await loadCustomRules(
      config.customRules,
      projectRoot,
    );
    allRules = [...builtinRules, ...customRules];
    for (const err of errors) {
      console.warn(`vali: warning — 커스텀 규칙 로드 실패: ${err.path} (${err.error})`);
    }
  }

  const fileResults = runRules(files, allRules, config, projectRoot);

  const allDiagnostics = fileResults.flatMap(f => f.diagnostics);

  // --fix: 자동 수정
  let fixResults: FixResult[] | undefined;
  if (options.fix) {
    const fixer = createFixer();
    fixResults = [];

    for (const fileResult of fileResults) {
      const filePath = resolve(projectRoot, fileResult.file);
      const sourceFile = parseFile(filePath);
      if (!sourceFile) continue;

      let fileContent: string;
      try {
        fileContent = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const context: RuleContext = {
        sourceFile,
        filePath,
        fileContent,
        config: resolveRuleConfig('', 'warning', config),
        projectRoot,
      };

      const result = fixer.fix(fileResult.diagnostics, context, {
        dryRun: options.dryRun ?? false,
      });

      if (result.applied.length > 0 || result.skipped.length > 0) {
        result.file = fileResult.file; // 상대 경로로 변환
        fixResults.push(result);
      }
    }
  }

  // quiet 모드: error만 필터링
  const filteredResults = options.quiet
    ? fileResults
        .map(f => ({
          ...f,
          diagnostics: f.diagnostics.filter(d => d.severity === 'error'),
        }))
        .filter(f => f.diagnostics.length > 0)
    : fileResults;

  const result: ScanResult = {
    files: filteredResults,
    summary: {
      totalFiles: files.length,
      filesWithIssues: filteredResults.length,
      errorCount: allDiagnostics.filter(d => d.severity === 'error').length,
      warningCount: allDiagnostics.filter(d => d.severity === 'warning').length,
      infoCount: allDiagnostics.filter(d => d.severity === 'info').length,
    },
    score: calculateSlopScore(allDiagnostics),
    fixResults,
  };

  // 출력
  if (options.format === 'sarif') {
    console.log(formatSarif(result, projectRoot));
  } else if (options.format === 'json' || options.ci) {
    console.log(formatJson(result));
  } else {
    console.log(formatTerminal(result, options.score));

    // fix 결과 출력
    if (fixResults && fixResults.length > 0) {
      console.log(formatFixResult(fixResults, options.dryRun ?? false));
    }
  }

  // exit code
  if (options.ci && result.summary.errorCount > 0) {
    process.exit(1);
  }
}
