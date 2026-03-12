import fg from 'fast-glob';
import { resolve } from 'node:path';
import type { ValiConfig } from '../types/index.js';

export async function scanFiles(
  targetPath: string,
  projectRoot: string,
  config: ValiConfig,
): Promise<string[]> {
  const absTarget = resolve(projectRoot, targetPath);
  const include = config.include ?? ['**/*.{ts,tsx,js,jsx}'];
  const exclude = config.exclude ?? ['node_modules/**'];

  const files = await fg(include, {
    cwd: absTarget,
    absolute: true,
    ignore: exclude,
    onlyFiles: true,
    dot: false,
  });

  return files.sort();
}
