import chalk from 'chalk';
import { rules } from '../../rules/index.js';
import { loadConfig, resolveRuleConfig } from '../../config/index.js';

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
};

export function rulesCommand(): void {
  const config = loadConfig(process.cwd());

  console.log('');
  console.log(chalk.bold('📋 Vali Rules'));
  console.log(chalk.dim('━'.repeat(40)));
  console.log('');

  for (const rule of rules) {
    const resolved = resolveRuleConfig(rule.id, rule.severity, config);
    const status = resolved.enabled ? chalk.green('ON') : chalk.dim('OFF');
    const severityColor = SEVERITY_COLOR[resolved.severity] ?? chalk.white;
    const severity = severityColor(resolved.severity);

    console.log(`  ${status}  ${chalk.bold(rule.id)} ${chalk.dim(rule.name)}`);
    console.log(`       ${severity} — ${rule.description}`);
    console.log('');
  }
}
