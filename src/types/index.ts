import type { SourceFile, TypeChecker } from 'ts-morph';

// === Severity ===

export type Severity = 'error' | 'warning' | 'info';

// === 규칙 인터페이스 ===

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  fixable?: boolean;
  check(context: RuleContext): Diagnostic[];
}

/** defineRule() 입력 옵션 */
export interface DefineRuleOptions {
  id: string;
  name: string;
  description?: string;
  severity?: Severity;
  fixable?: boolean;
  check(context: RuleContext): Diagnostic[];
}

// === 규칙 실행 컨텍스트 ===

export interface RuleContext {
  sourceFile: SourceFile;
  filePath: string;
  fileContent: string;
  config: ResolvedRuleConfig;
  projectRoot: string;
  typeChecker?: TypeChecker;
}

// === 진단 결과 ===

export interface Diagnostic {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  suggestion?: string;
}

// === 스캔 결과 ===

export interface ScanResult {
  files: FileResult[];
  summary: ScanSummary;
  score: SlopScore;
  fixResults?: FixResult[];
}

export interface FileResult {
  file: string;
  diagnostics: Diagnostic[];
}

export interface ScanSummary {
  totalFiles: number;
  filesWithIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface SlopScore {
  score: number;
  grade: 'clean' | 'low' | 'moderate' | 'high' | 'critical';
}

// === 설정 ===

export interface ValiConfig {
  rules?: Record<string, RuleConfig>;
  include?: string[];
  exclude?: string[];
  customRules?: string[];
}

/** 커스텀 규칙 로드 결과 */
export interface CustomRuleLoadResult {
  rules: Rule[];
  errors: CustomRuleError[];
}

export interface CustomRuleError {
  path: string;
  error: string;
}

export type RuleConfig =
  | boolean
  | Severity
  | [Severity, RuleOptions];

export interface RuleOptions {
  [key: string]: unknown;
}

export interface ResolvedRuleConfig {
  enabled: boolean;
  severity: Severity;
  options: RuleOptions;
}

// === CLI 옵션 ===

export interface CheckOptions {
  format: 'terminal' | 'json' | 'sarif';
  ci: boolean;
  score: boolean;
  config: string;
  quiet: boolean;
  fix?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  diffBase?: string;
}

// === Fix 타입 ===

export interface FixStrategy {
  ruleId: string;
  canFix(diagnostic: Diagnostic, context: RuleContext): boolean;
  fix(diagnostic: Diagnostic, context: RuleContext): FixAction[];
}

export interface FixAction {
  type: 'remove' | 'replace' | 'insert';
  line: number;
  endLine?: number;
  oldText?: string;
  newText?: string;
}

export interface FixResult {
  file: string;
  applied: AppliedFix[];
  skipped: SkippedFix[];
}

export interface AppliedFix {
  ruleId: string;
  line: number;
  description: string;
}

export interface SkippedFix {
  ruleId: string;
  line: number;
  reason: string;
}

// === Diff 타입 ===

export interface DiffOptions {
  base?: string;
  staged?: boolean;
}
