import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

const AI_BOILERPLATE_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /^\/\/\s*(This|The)\s+(file|module|class|component)\s+(contains?|provides?|implements?|defines?|handles?|is responsible)/i,
    description: 'AI 특유의 파일 설명 서문',
  },
  {
    pattern: /^\/\/\s*(Utility|Helper)\s+(functions?|methods?|classes?)\s+for/i,
    description: 'AI 특유의 유틸리티 설명',
  },
  {
    pattern: /^\/\*\*?\s*\n?\s*\*?\s*(This|The)\s+(file|module|class|component)\s+(contains?|provides?|implements?|defines?|handles?)/i,
    description: 'AI 특유의 블록 주석 서문',
  },
  {
    pattern: /^\/\/\s*(Auto-?generated|Generated)\s+(by|from|using)/i,
    description: '자동 생성 표시',
  },
  {
    pattern: /^\/\/\s*={3,}\s*$/,
    description: '과도한 섹션 구분선 (===)',
  },
  {
    pattern: /^\/\/\s*-{3,}\s*$/,
    description: '과도한 섹션 구분선 (---)',
  },
  {
    pattern: /^\/\/\s*(Note|Important|Remember):\s*(This|The|We|You)/i,
    description: 'AI 특유의 과잉 친절 주석',
  },
];

const SCAN_LINES = 10;

const val009: Rule = {
  id: 'VAL009',
  name: 'ai-boilerplate',
  description: 'AI가 생성하는 특유의 서문/보일러플레이트 패턴을 감지합니다',
  severity: 'info',

  check(context: RuleContext): Diagnostic[] {
    const { fileContent, filePath } = context;
    const diagnostics: Diagnostic[] = [];
    const lines = fileContent.split('\n');
    const scanEnd = Math.min(lines.length, SCAN_LINES);

    for (let i = 0; i < scanEnd; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      for (const { pattern, description } of AI_BOILERPLATE_PATTERNS) {
        if (pattern.test(trimmed)) {
          diagnostics.push({
            ruleId: 'VAL009',
            ruleName: 'ai-boilerplate',
            severity: 'info',
            message: `${description}: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '...' : ''}"`,
            file: filePath,
            line: i + 1,
            suggestion: '이 주석은 AI가 자동 생성한 서문입니다. 삭제를 고려하세요',
          });
          break; // 같은 줄에서 중복 감지 방지
        }
      }
    }

    return diagnostics;
  },
};

export default val009;
