import { SyntaxKind, type Node } from 'ts-morph';
import type { Rule, Diagnostic, RuleContext } from '../types/index.js';

interface NearDuplicateOptions {
  minLines: number;
  similarity: number;
}

interface FunctionBlock {
  name: string;
  line: number;
  endLine: number;
  normalized: string[];
}

function getFuncName(node: Node): string {
  if (node.getKind() === SyntaxKind.FunctionDeclaration || node.getKind() === SyntaxKind.MethodDeclaration) {
    const nameNode = node.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }
  const parent = node.getParent();
  if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
    const nameNode = parent.getChildrenOfKind(SyntaxKind.Identifier)[0];
    return nameNode?.getText() ?? '(anonymous)';
  }
  return '(anonymous)';
}

function normalizeCode(bodyText: string): string[] {
  const lines = bodyText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*'));

  // 식별자 수집: 변수/파라미터명을 플레이스홀더로 치환
  const identifiers = new Map<string, string>();
  let idCounter = 0;

  return lines.map(line => {
    let normalized = line
      .replace(/['"`][^'"`]*['"`]/g, '$STR')  // 문자열 리터럴
      .replace(/\b\d+(\.\d+)?\b/g, '$NUM');   // 숫자 리터럴

    // 식별자 정규화: word.prop 패턴에서 word를 플레이스홀더로
    normalized = normalized.replace(/\b([a-z_]\w*)\./gi, (match, ident) => {
      // 예약어 및 글로벌 객체는 유지
      if (['this', 'super', 'console', 'Math', 'JSON', 'Object', 'Array', 'String',
           'Number', 'Date', 'Promise', 'Error', 'Map', 'Set', 'new'].includes(ident)) {
        return match;
      }
      if (!identifiers.has(ident)) {
        identifiers.set(ident, `$v${idCounter++}`);
      }
      return identifiers.get(ident)! + '.';
    });

    return normalized;
  });
}

function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // 메모리 최적화: 2행만 유지
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}

function calculateSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const lcs = lcsLength(a, b);
  return (2 * lcs) / (a.length + b.length);
}

const val006: Rule = {
  id: 'VAL006',
  name: 'near-duplicate',
  description: '높은 유사도의 코드 블록(코드 클론)을 감지합니다',
  severity: 'warning',

  check(context: RuleContext): Diagnostic[] {
    const { sourceFile, filePath } = context;
    const options = context.config.options as Partial<NearDuplicateOptions>;
    const minLines = options.minLines ?? 5;
    const similarityThreshold = options.similarity ?? 0.9;
    const diagnostics: Diagnostic[] = [];

    // 함수/메서드 추출
    const functionKinds = [
      SyntaxKind.FunctionDeclaration,
      SyntaxKind.MethodDeclaration,
      SyntaxKind.ArrowFunction,
      SyntaxKind.FunctionExpression,
    ];

    const blocks: FunctionBlock[] = [];

    for (const kind of functionKinds) {
      for (const node of sourceFile.getDescendantsOfKind(kind)) {
        const body = node.getChildrenOfKind(SyntaxKind.Block)[0];
        if (!body) continue;

        const lineCount = node.getEndLineNumber() - node.getStartLineNumber() + 1;
        if (lineCount < minLines) continue;

        const name = getFuncName(node);
        const normalized = normalizeCode(body.getText());

        if (normalized.length < minLines) continue;

        blocks.push({
          name,
          line: node.getStartLineNumber(),
          endLine: node.getEndLineNumber(),
          normalized,
        });
      }
    }

    // 쌍별 유사도 비교
    const reported = new Set<string>();
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];

        const sim = calculateSimilarity(a.normalized, b.normalized);
        if (sim >= similarityThreshold) {
          const pairKey = `${a.line}-${b.line}`;
          if (reported.has(pairKey)) continue;
          reported.add(pairKey);

          const percent = Math.round(sim * 100);
          diagnostics.push({
            ruleId: 'VAL006',
            ruleName: 'near-duplicate',
            severity: 'warning',
            message: `${a.name}() (L${a.line})과(와) ${b.name}() (L${b.line})이(가) ${percent}% 유사합니다`,
            file: filePath,
            line: b.line,
            endLine: b.endLine,
            suggestion: '중복 코드를 공통 함수로 추출하세요',
          });
        }
      }
    }

    return diagnostics;
  },
};

export default val006;
