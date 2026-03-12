import { Project, type SourceFile } from 'ts-morph';
import type { Rule as ValiRule, ResolvedRuleConfig } from '@promptnroll/vali/types';

let cachedProject: Project | null = null;

function getProject(): Project {
  if (!cachedProject) {
    cachedProject = new Project({
      compilerOptions: { allowJs: true, checkJs: false },
      skipAddingFilesFromTsConfig: true,
    });
  }
  return cachedProject;
}

export function createESLintRule(valiRule: ValiRule) {
  return {
    meta: {
      type: 'suggestion' as const,
      docs: {
        description: valiRule.description,
        recommended: true,
      },
      fixable: valiRule.fixable ? ('code' as const) : undefined,
      schema: [],
      messages: {
        [valiRule.id]: '{{ message }}',
      },
    },

    create(context: any) {
      return {
        Program(node: any) {
          const filename = context.getFilename();
          const sourceCode = context.getSourceCode().getText();

          const project = getProject();
          let sourceFile: SourceFile;

          try {
            sourceFile = project.createSourceFile(
              `__eslint_${Date.now()}.ts`,
              sourceCode,
              { overwrite: true },
            );
          } catch {
            return;
          }

          const config: ResolvedRuleConfig = {
            enabled: true,
            severity: valiRule.severity,
            options: {},
          };

          try {
            const diagnostics = valiRule.check({
              sourceFile,
              filePath: filename,
              fileContent: sourceCode,
              config,
              projectRoot: process.cwd(),
            });

            for (const d of diagnostics) {
              context.report({
                node,
                loc: {
                  start: { line: d.line, column: 0 },
                  end: { line: d.endLine ?? d.line, column: 0 },
                },
                messageId: valiRule.id,
                data: { message: d.message },
              });
            }
          } finally {
            project.removeSourceFile(sourceFile);
          }
        },
      };
    },
  };
}
