import type { ScanResult } from '../../types/index.js';

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
