import type { ScanResult, Diagnostic, Severity } from '../../types/index.js';
import { rules } from '../../rules/index.js';

interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRuleDescriptor[];
    };
  };
  results: SarifResult[];
}

interface SarifRuleDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: {
      startLine: number;
      endLine?: number;
      startColumn?: number;
    };
  };
}

function severityToLevel(severity: Severity): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'note';
  }
}

function diagnosticToSarifResult(d: Diagnostic, projectRoot: string): SarifResult {
  const relativePath = d.file.startsWith(projectRoot)
    ? d.file.slice(projectRoot.length + 1)
    : d.file;

  return {
    ruleId: d.ruleId,
    level: severityToLevel(d.severity),
    message: { text: d.suggestion ? `${d.message}. ${d.suggestion}` : d.message },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: relativePath },
        region: {
          startLine: d.line,
          endLine: d.endLine,
          startColumn: d.column,
        },
      },
    }],
  };
}

export function formatSarif(result: ScanResult, projectRoot: string): string {
  const sarifLog: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'vali',
          version: '0.4.0',
          informationUri: 'https://github.com/user/vali',
          rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            shortDescription: { text: r.description },
            defaultConfiguration: { level: severityToLevel(r.severity) },
            helpUri: `https://github.com/user/vali/blob/main/docs/api/rules.md#${r.name}`,
          })),
        },
      },
      results: result.files.flatMap(f =>
        f.diagnostics.map(d => diagnosticToSarifResult(d, projectRoot))
      ),
    }],
  };

  return JSON.stringify(sarifLog, null, 2);
}
