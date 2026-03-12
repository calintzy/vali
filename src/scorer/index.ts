import type { Diagnostic, SlopScore, Severity } from '../types/index.js';

const WEIGHTS: Record<Severity, number> = {
  error: 10,
  warning: 5,
  info: 2,
};

export function calculateSlopScore(diagnostics: Diagnostic[]): SlopScore {
  const totalWeight = diagnostics.reduce(
    (sum, d) => sum + WEIGHTS[d.severity],
    0,
  );

  const score = Math.min(totalWeight, 100);
  return { score, grade: getGrade(score) };
}

function getGrade(score: number): SlopScore['grade'] {
  if (score === 0) return 'clean';
  if (score <= 15) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 70) return 'high';
  return 'critical';
}

export function getGradeLabel(grade: SlopScore['grade']): string {
  const labels: Record<SlopScore['grade'], string> = {
    clean: 'clean — no AI slop detected',
    low: 'low — minor improvements possible',
    moderate: 'moderate — needs cleanup',
    high: 'high — significant issues',
    critical: 'critical — requires immediate attention',
  };
  return labels[grade];
}
