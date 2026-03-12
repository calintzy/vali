import chalk from 'chalk';
import type { ScanResult, Severity, FixResult } from '../../types/index.js';
import { getGradeLabel } from '../../scorer/index.js';

const SEVERITY_ICON: Record<Severity, string> = {
  error: chalk.red('⛔'),
  warning: chalk.yellow('⚠️'),
  info: chalk.blue('💬'),
};

const SEVERITY_COLOR: Record<Severity, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
};

export function formatTerminal(result: ScanResult, showScore: boolean): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('🔍 Vali: AI Code Quality Report'));
  lines.push(chalk.dim('━'.repeat(40)));
  lines.push('');

  if (result.files.length === 0) {
    lines.push(chalk.green('  ✅ 문제가 발견되지 않았습니다'));
    lines.push('');
  } else {
    for (const fileResult of result.files) {
      lines.push(chalk.underline(fileResult.file));

      for (const d of fileResult.diagnostics) {
        const icon = SEVERITY_ICON[d.severity];
        const color = SEVERITY_COLOR[d.severity];
        const loc = d.endLine && d.endLine !== d.line
          ? `L${d.line}-${d.endLine}`
          : `L${d.line}`;

        lines.push(`  ${icon} ${chalk.dim(loc)}: ${color(d.ruleName)} — ${d.message}`);
      }

      lines.push('');
    }
  }

  // Summary
  lines.push(chalk.dim('━'.repeat(40)));

  const { summary } = result;
  const parts = [
    `${summary.totalFiles} files`,
    summary.errorCount > 0 ? chalk.red(`${summary.errorCount} errors`) : null,
    summary.warningCount > 0 ? chalk.yellow(`${summary.warningCount} warnings`) : null,
    summary.infoCount > 0 ? chalk.blue(`${summary.infoCount} info`) : null,
  ].filter(Boolean);

  lines.push(`Summary: ${parts.join(' | ')}`);

  // Score
  if (showScore) {
    const { score } = result;
    const gradeLabel = getGradeLabel(score.grade);
    const scoreColor = score.score <= 15 ? chalk.green : score.score <= 40 ? chalk.yellow : chalk.red;
    lines.push(`AI Slop Score: ${scoreColor(`${score.score}/100`)} (${gradeLabel})`);
  }

  lines.push('');
  return lines.join('\n');
}

export function formatFixResult(fixResults: FixResult[], dryRun: boolean): string {
  const lines: string[] = [];
  const title = dryRun ? '🔧 Vali: Fix Preview (dry-run)' : '🔧 Vali: Fix Applied';

  lines.push(chalk.bold(title));
  lines.push(chalk.dim('━'.repeat(40)));
  lines.push('');

  let totalApplied = 0;
  let totalSkipped = 0;

  for (const result of fixResults) {
    lines.push(chalk.underline(result.file));

    for (const fix of result.applied) {
      const icon = dryRun ? '🔧' : '✅';
      const verb = dryRun ? '예정' : '완료';
      lines.push(`  ${icon} L${fix.line}: ${chalk.cyan(fix.ruleId)} — ${fix.description.slice(0, 60)} ${chalk.dim(`[${verb}]`)}`);
    }

    for (const skip of result.skipped) {
      lines.push(`  ⏭️ L${skip.line}: ${chalk.dim(skip.ruleId)} — ${skip.reason}`);
    }

    totalApplied += result.applied.length;
    totalSkipped += result.skipped.length;
    lines.push('');
  }

  lines.push(chalk.dim('━'.repeat(40)));
  const verb = dryRun ? 'Preview' : 'Fixed';
  lines.push(`${verb}: ${fixResults.length} files | ${totalApplied} fixes ${dryRun ? 'applicable' : 'applied'} | ${totalSkipped} skipped`);
  if (dryRun) {
    lines.push(chalk.dim('Run without --dry-run to apply fixes.'));
  }
  lines.push('');

  return lines.join('\n');
}
