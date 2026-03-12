import { Fixer } from '../index.js';
import fixDeadParam from './fix-dead-param.js';
import fixAiBoilerplate from './fix-ai-boilerplate.js';
import fixEmptyFunction from './fix-empty-function.js';

export function createFixer(): Fixer {
  const fixer = new Fixer();
  fixer.register(fixDeadParam);
  fixer.register(fixAiBoilerplate);
  fixer.register(fixEmptyFunction);
  return fixer;
}
