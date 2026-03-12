export { defineRule } from './api/define-rule.js';
export { rules, getRuleById, getRuleByName } from './rules/index.js';
export { loadConfig, resolveRuleConfig } from './config/index.js';

export type {
  Rule,
  RuleContext,
  Diagnostic,
  Severity,
  DefineRuleOptions,
  ValiConfig,
  ResolvedRuleConfig,
  FixStrategy,
  FixAction,
} from './types/index.js';
