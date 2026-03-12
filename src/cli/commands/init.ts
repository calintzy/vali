import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDefaultConfig } from '../../config/index.js';

export function initCommand(): void {
  const configPath = resolve(process.cwd(), '.valirc.json');

  if (existsSync(configPath)) {
    console.log('vali: .valirc.json 파일이 이미 존재합니다');
    return;
  }

  const config = getDefaultConfig();
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log('vali: .valirc.json 파일이 생성되었습니다');
}
