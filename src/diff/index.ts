import { execSync } from 'node:child_process';
import type { DiffOptions } from '../types/index.js';

export function getChangedFiles(
  projectRoot: string,
  options: DiffOptions = {},
): string[] {
  const base = options.base ?? 'HEAD';
  const args = ['diff', '--name-only', '--diff-filter=ACMR'];

  if (options.staged) {
    args.push('--staged');
  } else {
    args.push(base);
  }

  try {
    const result = execSync(`git ${args.join(' ')}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result
      .split('\n')
      .filter(f => f.trim().length > 0);
  } catch {
    console.warn('vali: warning — git diff 실행 실패. 모든 파일을 검사합니다');
    return [];
  }
}
