import { Project, type SourceFile } from 'ts-morph';

let cachedProject: Project | null = null;

function getProject(): Project {
  if (!cachedProject) {
    cachedProject = new Project({
      compilerOptions: {
        allowJs: true,
        noEmit: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
    });
  }
  return cachedProject;
}

export function parseFile(filePath: string): SourceFile | null {
  try {
    const project = getProject();
    const existing = project.getSourceFile(filePath);
    if (existing) {
      return existing;
    }
    return project.addSourceFileAtPath(filePath);
  } catch {
    return null;
  }
}

export function parseFiles(filePaths: string[]): Map<string, SourceFile> {
  const result = new Map<string, SourceFile>();

  for (const filePath of filePaths) {
    const sourceFile = parseFile(filePath);
    if (sourceFile) {
      result.set(filePath, sourceFile);
    }
  }

  return result;
}

export function clearCache(): void {
  cachedProject = null;
}
