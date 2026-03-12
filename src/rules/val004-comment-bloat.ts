import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

interface CommentBloatOptions {
  threshold: number;
}

function analyzeLines(content: string): { codeLines: number; commentLines: number } {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 빈 줄 무시
    if (trimmed.length === 0) continue;

    if (inBlockComment) {
      commentLines++;
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // 블록 주석 시작
    if (trimmed.startsWith('/*')) {
      commentLines++;
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    // 단일 줄 주석 (줄 전체가 주석)
    if (trimmed.startsWith('//')) {
      commentLines++;
      continue;
    }

    // 코드 줄 (인라인 주석 포함해도 코드로 분류)
    codeLines++;
  }

  return { codeLines, commentLines };
}

const val004: Rule = {
  id: 'VAL004',
  name: 'comment-bloat',
  description: '코드 대비 과도한 주석 비율을 감지합니다',
  severity: 'info',

  check(context: RuleContext): Diagnostic[] {
    const { fileContent, filePath } = context;
    const options = context.config.options as Partial<CommentBloatOptions>;
    const threshold = options.threshold ?? 0.4;

    const { codeLines, commentLines } = analyzeLines(fileContent);
    const totalLines = codeLines + commentLines;

    if (totalLines === 0) return [];

    const ratio = commentLines / totalLines;

    if (ratio > threshold) {
      const percent = Math.round(ratio * 100);
      return [{
        ruleId: 'VAL004',
        ruleName: 'comment-bloat',
        severity: 'info',
        message: `주석 비율 ${percent}% (${commentLines}줄 주석 / ${codeLines}줄 코드) — 임계값 ${Math.round(threshold * 100)}% 초과`,
        file: filePath,
        line: 1,
        endLine: fileContent.split('\n').length,
        suggestion: '불필요한 주석을 정리하세요. 코드가 자명한 경우 주석이 필요하지 않습니다',
      }];
    }

    return [];
  },
};

export default val004;
