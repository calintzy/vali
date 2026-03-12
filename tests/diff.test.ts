import { describe, it, expect } from 'vitest';
import { getChangedFiles } from '../src/diff/index.js';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

describe('Diff Module', () => {
  it('getChangedFiles 반환값은 배열', () => {
    const files = getChangedFiles(PROJECT_ROOT);
    expect(Array.isArray(files)).toBe(true);
  });

  it('잘못된 base ref도 에러 없이 빈 배열 반환', () => {
    const files = getChangedFiles(PROJECT_ROOT, { base: 'nonexistent-ref-12345' });
    expect(Array.isArray(files)).toBe(true);
  });

  it('존재하지 않는 디렉토리에서도 빈 배열 반환', () => {
    const files = getChangedFiles('/nonexistent/directory');
    expect(Array.isArray(files)).toBe(true);
    expect(files).toHaveLength(0);
  });
});
