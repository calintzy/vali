import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { initCommand } from './commands/init.js';
import { rulesCommand } from './commands/rules.js';
import type { CheckOptions } from '../types/index.js';

const program = new Command();

program
  .name('vali')
  .description('AI 생성 코드의 환각, 슬롭, 과잉설계를 자동 감지하는 린터')
  .version('0.3.0');

program
  .command('check')
  .description('파일/디렉토리의 AI 코드 품질 검사')
  .argument('[path]', '검사할 경로', '.')
  .option('--format <type>', '출력 형식 (terminal | json | sarif)', 'terminal')
  .option('--ci', 'CI 모드 (JSON 출력 + exit code)', false)
  .option('--no-score', 'Slop Score 출력 생략')
  .option('--config <path>', '설정 파일 경로', '.valirc.json')
  .option('--quiet', 'error만 출력', false)
  .option('--fix', '자동 수정 적용', false)
  .option('--dry-run', '수정 미리보기 (--fix와 함께 사용)', false)
  .option('--diff', 'Git 변경 파일만 검사', false)
  .option('--diff-base <ref>', 'diff 비교 기준', 'HEAD')
  .action(async (path: string, opts) => {
    const options: CheckOptions = {
      format: opts.format,
      ci: opts.ci,
      score: opts.score !== false,
      config: opts.config,
      quiet: opts.quiet,
      fix: opts.fix,
      dryRun: opts.dryRun,
      diff: opts.diff,
      diffBase: opts.diffBase,
    };
    await checkCommand(path, options);
  });

program
  .command('init')
  .description('.valirc.json 설정 파일 생성')
  .action(() => {
    initCommand();
  });

program
  .command('rules')
  .description('활성 규칙 목록 출력')
  .action(() => {
    rulesCommand();
  });

program.parse();
