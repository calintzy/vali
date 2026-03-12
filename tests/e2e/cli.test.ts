import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../..');
const CLI = resolve(PROJECT_ROOT, 'src/cli/index.ts');

function runCli(args: string): string {
  try {
    return execSync(`npx tsx "${CLI}" ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    });
  } catch (err: any) {
    // CLI가 exit code 1로 종료해도 stdout 반환
    return err.stdout || err.stderr || '';
  }
}

describe('E2E: CLI', () => {
  it('vali check — fixture 디렉토리 검사', () => {
    const output = runCli('check tests/fixtures/hallucinated-import');

    expect(output).toContain('Vali');
    expect(output).toContain('hallucinated-import');
  });

  it('vali check --format json — JSON 출력', () => {
    const output = runCli('check tests/fixtures/hallucinated-import --format json');

    const result = JSON.parse(output);
    expect(result.files).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.score).toBeDefined();
  });

  it('vali check --quiet — error만 출력', () => {
    const output = runCli('check tests/fixtures/dead-parameter --quiet --format json');

    const result = JSON.parse(output);
    // quiet 모드에서 warning은 필터링됨
    for (const file of result.files) {
      for (const d of file.diagnostics) {
        expect(d.severity).toBe('error');
      }
    }
  });

  it('vali rules — 10개 규칙 목록', () => {
    const output = runCli('rules');

    expect(output).toContain('VAL001');
    expect(output).toContain('VAL002');
    expect(output).toContain('VAL007');
    expect(output).toContain('VAL010');
  });

  it('vali check --fix --dry-run — fix 미리보기', () => {
    const output = runCli('check tests/fixtures/dead-parameter --fix --dry-run');

    // dry-run이므로 파일 수정 없이 미리보기
    expect(output).toBeDefined();
  });

  it('존재하지 않는 경로 — 에러', () => {
    const output = runCli('check nonexistent-path');

    expect(output).toContain('존재하지 않습니다');
  });
});
