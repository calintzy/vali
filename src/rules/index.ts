import type { Rule } from '../types/index.js';
import val001 from './val001-hallucinated-import.js';
import val002 from './val002-hallucinated-api.js';
import val003 from './val003-empty-function.js';
import val004 from './val004-comment-bloat.js';
import val005 from './val005-over-engineered.js';
import val006 from './val006-near-duplicate.js';
import val007 from './val007-dead-parameter.js';
import val008 from './val008-excessive-error.js';
import val009 from './val009-ai-boilerplate.js';
import val010 from './val010-unused-abstraction.js';

export const rules: Rule[] = [
  val001,
  val002,
  val003,
  val004,
  val005,
  val006,
  val007,
  val008,
  val009,
  val010,
];

export function getRuleById(id: string): Rule | undefined {
  return rules.find(r => r.id === id);
}

export function getRuleByName(name: string): Rule | undefined {
  return rules.find(r => r.name === name);
}
