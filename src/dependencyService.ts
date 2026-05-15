import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

interface ImportReference {
  specifier: string;
  namedImports: Set<string>;
}

interface PathAlias {
  pattern: string;
  targets: string[];
  prefix: string;
  suffix: string;
  hasWildcard: boolean;
}

interface ResolverOptions {
  baseDirectory: string;
  aliases: PathAlias[];
}

interface ProjectConfig {
  baseDirectory: string;
  paths: Record<string, unknown>;
}

export class DependencyService {
  private resolverOptionsPromise: Promise<ResolverOptions> | undefined;

  public constructor(private readonly workspaceRoot: string | undefined) {}

  public async findDependencies(relativePath: string): Promise<string[]> {
    const workspaceRoot = this.getWorkspaceRoot();
    const normalizedEntry = normalizePath(relativePath);
    const dependencies = await this.getDirectDependencies(normalizedEntry, workspaceRoot);

    dependencies.delete(normalizedEntry);

    return [...dependencies].sort((a, b) => a.localeCompare(b));
  }

  private async getDirectDependencies(relativePath: string, workspaceRoot: string): Promise<Set<string>> {
    const dependencies = new Set<string>();
    const absolutePath = path.join(workspaceRoot, relativePath);
    const contents = await readTextFile(absolutePath);
    if (contents === undefined) {
      return dependencies;
    }

    for (const reference of extractImportReferences(contents)) {
      const dependency = await this.resolveImport(relativePath, reference.specifier, workspaceRoot);
      if (dependency) {
        const namedBarrelDependencies = await this.resolveNamedBarrelDependencies(
          dependency,
          reference.namedImports,
          workspaceRoot
        );

        if (namedBarrelDependencies.length) {
          namedBarrelDependencies.forEach((namedDependency) => dependencies.add(namedDependency));
        } else {
          dependencies.add(dependency);
        }
      }
    }

    return dependencies;
  }

  private async resolveImport(relativePath: string, specifier: string, workspaceRoot: string): Promise<string | undefined> {
    if (specifier.startsWith('.')) {
      const importerDirectory = path.dirname(path.join(workspaceRoot, relativePath));
      return resolveWorkspaceFile(path.resolve(importerDirectory, specifier), workspaceRoot);
    }

    return this.resolveAliasedImport(specifier, workspaceRoot);
  }

  private async resolveAliasedImport(specifier: string, workspaceRoot: string): Promise<string | undefined> {
    const resolverOptions = await this.getResolverOptions(workspaceRoot);

    for (const alias of resolverOptions.aliases) {
      const wildcardValue = matchAlias(alias, specifier);
      if (wildcardValue === undefined) {
        continue;
      }

      for (const target of alias.targets) {
        const candidate = alias.hasWildcard ? target.replace('*', wildcardValue) : target;
        const candidateBase = path.resolve(resolverOptions.baseDirectory, candidate);
        const resolved = await resolveWorkspaceFile(candidateBase, workspaceRoot);

        if (resolved) {
          return resolved;
        }
      }
    }

    return undefined;
  }

  private async resolveNamedBarrelDependencies(
    relativePath: string,
    importedNames: Set<string>,
    workspaceRoot: string
  ): Promise<string[]> {
    return this.resolveNamedExports(relativePath, importedNames, workspaceRoot, new Set());
  }

  private async resolveNamedExports(
    relativePath: string,
    importedNames: Set<string>,
    workspaceRoot: string,
    visited: Set<string>
  ): Promise<string[]> {
    if (!importedNames.size || visited.has(relativePath)) {
      return [];
    }
    visited.add(relativePath);

    const contents = await readTextFile(path.join(workspaceRoot, relativePath));
    if (contents === undefined) {
      return [];
    }

    const dependencies = new Set<string>();
    for (const reExport of extractNamedReExports(contents)) {
      if (!reExport.exportedNames.some((exportedName) => importedNames.has(exportedName))) {
        continue;
      }

      const dependency = await this.resolveImport(relativePath, reExport.specifier, workspaceRoot);
      if (dependency) {
        dependencies.add(dependency);
      }
    }

    for (const specifier of extractExportStarSpecifiers(contents)) {
      const dependency = await this.resolveImport(relativePath, specifier, workspaceRoot);
      if (!dependency) {
        continue;
      }

      if (await fileExportsAnyName(dependency, importedNames, workspaceRoot)) {
        dependencies.add(dependency);
        continue;
      }

      const nestedDependencies = await this.resolveNamedExports(dependency, importedNames, workspaceRoot, visited);
      nestedDependencies.forEach((nestedDependency) => dependencies.add(nestedDependency));
    }

    return [...dependencies];
  }

  private async getResolverOptions(workspaceRoot: string): Promise<ResolverOptions> {
    this.resolverOptionsPromise ??= loadResolverOptions(workspaceRoot);
    return this.resolverOptionsPromise;
  }

  private getWorkspaceRoot(): string {
    if (!this.workspaceRoot) {
      throw new Error('Workspace folder not found.');
    }

    return this.workspaceRoot;
  }
}

async function loadResolverOptions(workspaceRoot: string): Promise<ResolverOptions> {
  const configPath = await findProjectConfig(workspaceRoot);
  if (!configPath) {
    return { baseDirectory: workspaceRoot, aliases: [] };
  }

  const projectConfig = await readProjectConfig(configPath);
  return {
    baseDirectory: projectConfig.baseDirectory,
    aliases: Object.entries(projectConfig.paths)
      .flatMap(([pattern, targets]) => createPathAlias(pattern, targets))
      .sort((a, b) => b.prefix.length - a.prefix.length)
  };
}

function extractImportReferences(contents: string): ImportReference[] {
  const references: ImportReference[] = [];
  const seen = new Set<string>();

  collectImportReferences(
    contents,
    /\bimport\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    references,
    seen
  );
  collectImportReferences(
    contents,
    /\bexport\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    references,
    seen
  );
  collectBareSpecifiers(contents, /\bimport\s+['"]([^'"]+)['"]/g, references, seen);
  collectBareSpecifiers(contents, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, references, seen);
  collectBareSpecifiers(contents, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, references, seen);

  return references;
}

function collectImportReferences(
  contents: string,
  pattern: RegExp,
  references: ImportReference[],
  seen: Set<string>
): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(contents)) !== null) {
    addImportReference(references, seen, match[2], extractNamedBindings(match[1]));
  }
}

function collectBareSpecifiers(
  contents: string,
  pattern: RegExp,
  references: ImportReference[],
  seen: Set<string>
): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(contents)) !== null) {
    addImportReference(references, seen, match[1], new Set());
  }
}

function addImportReference(
  references: ImportReference[],
  seen: Set<string>,
  specifier: string,
  namedImports: Set<string>
): void {
  const key = `${specifier}\0${[...namedImports].sort().join(',')}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  references.push({ specifier, namedImports });
}

function extractNamedBindings(importClause: string): Set<string> {
  const namedImports = new Set<string>();
  const match = importClause.match(/\{([\s\S]*?)\}/);
  if (!match) {
    return namedImports;
  }

  for (const part of match[1].split(',')) {
    const normalizedPart = part.trim();
    if (!normalizedPart) {
      continue;
    }

    const importedName = normalizedPart
      .replace(/^type\s+/, '')
      .split(/\s+as\s+/)[0]
      .trim();

    if (importedName) {
      namedImports.add(importedName);
    }
  }

  return namedImports;
}

function extractNamedReExports(contents: string): Array<{ exportedNames: string[]; specifier: string }> {
  const reExports: Array<{ exportedNames: string[]; specifier: string }> = [];
  const pattern = /\bexport\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;

  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(contents)) !== null) {
    reExports.push({
      exportedNames: extractExportedNames(match[1]),
      specifier: match[2]
    });
  }

  return reExports;
}

function extractExportStarSpecifiers(contents: string): string[] {
  const specifiers = new Set<string>();
  const pattern = /\bexport\s+(?:type\s+)?\*\s+from\s+['"]([^'"]+)['"]/g;

  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(contents)) !== null) {
    specifiers.add(match[1]);
  }

  return [...specifiers];
}

function extractExportedNames(exportClause: string): string[] {
  return exportClause
    .split(',')
    .map((part) => {
      const normalizedPart = part.trim().replace(/^type\s+/, '');
      const aliasMatch = normalizedPart.match(/\s+as\s+(.+)$/);
      return (aliasMatch?.[1] ?? normalizedPart).trim();
    })
    .filter(Boolean);
}

async function fileExportsAnyName(
  relativePath: string,
  exportedNames: Set<string>,
  workspaceRoot: string
): Promise<boolean> {
  const contents = await readTextFile(path.join(workspaceRoot, relativePath));
  if (contents === undefined) {
    return false;
  }

  return extractLocalExportedNames(contents).some((exportedName) => exportedNames.has(exportedName));
}

function extractLocalExportedNames(contents: string): string[] {
  const names = new Set<string>();
  const declarationPattern = /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  const localExportPattern = /\bexport\s+(?:type\s+)?\{([\s\S]*?)\}(?!\s+from\b)/g;

  declarationPattern.lastIndex = 0;
  let declarationMatch: RegExpExecArray | null;
  while ((declarationMatch = declarationPattern.exec(contents)) !== null) {
    names.add(declarationMatch[1]);
  }

  localExportPattern.lastIndex = 0;
  let localExportMatch: RegExpExecArray | null;
  while ((localExportMatch = localExportPattern.exec(contents)) !== null) {
    extractExportedNames(localExportMatch[1]).forEach((exportedName) => names.add(exportedName));
  }

  return [...names];
}

async function resolveExistingFile(candidateBase: string): Promise<string | undefined> {
  const candidates = [
    candidateBase,
    ...supportedExtensions.map((extension) => `${candidateBase}${extension}`),
    ...supportedExtensions.map((extension) => path.join(candidateBase, `index${extension}`))
  ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function resolveWorkspaceFile(candidateBase: string, workspaceRoot: string): Promise<string | undefined> {
  const resolved = await resolveExistingFile(candidateBase);
  if (!resolved) {
    return undefined;
  }

  const resolvedRelativePath = normalizePath(path.relative(workspaceRoot, resolved));
  if (resolvedRelativePath.startsWith('..') || path.isAbsolute(resolvedRelativePath)) {
    return undefined;
  }

  return resolvedRelativePath;
}

async function findProjectConfig(workspaceRoot: string): Promise<string | undefined> {
  for (const filename of ['tsconfig.json', 'jsconfig.json']) {
    const configPath = path.join(workspaceRoot, filename);
    if (await isFile(configPath)) {
      return configPath;
    }
  }

  return undefined;
}

async function readProjectConfig(configPath: string, visited = new Set<string>()): Promise<ProjectConfig> {
  const normalizedConfigPath = path.resolve(configPath);
  if (visited.has(normalizedConfigPath)) {
    return {
      baseDirectory: path.dirname(normalizedConfigPath),
      paths: {}
    };
  }
  visited.add(normalizedConfigPath);

  const config = await readJsonConfig(normalizedConfigPath);
  const configDirectory = path.dirname(normalizedConfigPath);
  const ownCompilerOptions = isRecord(config.compilerOptions) ? config.compilerOptions : {};
  const ownBaseDirectory = typeof ownCompilerOptions.baseUrl === 'string'
    ? path.resolve(configDirectory, ownCompilerOptions.baseUrl)
    : undefined;
  const ownPaths = isRecord(ownCompilerOptions.paths) ? ownCompilerOptions.paths : undefined;
  const extendedConfigPath = await resolveExtendedConfigPath(config.extends, configDirectory);

  if (!extendedConfigPath) {
    return {
      baseDirectory: ownBaseDirectory ?? configDirectory,
      paths: ownPaths ?? {}
    };
  }

  const parentConfig = await readProjectConfig(extendedConfigPath, visited);
  return {
    baseDirectory: ownBaseDirectory ?? parentConfig.baseDirectory,
    paths: ownPaths ?? parentConfig.paths
  };
}

async function readJsonConfig(configPath: string): Promise<Record<string, unknown>> {
  const contents = await readTextFile(configPath);
  if (!contents) {
    return {};
  }

  try {
    const parsed = JSON.parse(normalizeJsonConfig(contents));
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function resolveExtendedConfigPath(extendsValue: unknown, configDirectory: string): Promise<string | undefined> {
  if (typeof extendsValue !== 'string') {
    return undefined;
  }

  if (extendsValue.startsWith('.')) {
    return resolveConfigFile(path.resolve(configDirectory, extendsValue));
  }

  if (path.isAbsolute(extendsValue)) {
    return resolveConfigFile(extendsValue);
  }

  return resolveConfigFile(path.resolve(configDirectory, 'node_modules', extendsValue));
}

async function resolveConfigFile(candidateBase: string): Promise<string | undefined> {
  const candidates = [
    candidateBase,
    `${candidateBase}.json`,
    path.join(candidateBase, 'tsconfig.json')
  ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function createPathAlias(pattern: string, targets: unknown): PathAlias[] {
  if (!Array.isArray(targets) || !targets.every((target): target is string => typeof target === 'string')) {
    return [];
  }

  const wildcardIndex = pattern.indexOf('*');
  return [{
    pattern,
    targets,
    prefix: wildcardIndex >= 0 ? pattern.slice(0, wildcardIndex) : pattern,
    suffix: wildcardIndex >= 0 ? pattern.slice(wildcardIndex + 1) : '',
    hasWildcard: wildcardIndex >= 0
  }];
}

function matchAlias(alias: PathAlias, specifier: string): string | undefined {
  if (!alias.hasWildcard) {
    return specifier === alias.pattern ? '' : undefined;
  }

  if (!specifier.startsWith(alias.prefix) || !specifier.endsWith(alias.suffix)) {
    return undefined;
  }

  return specifier.slice(alias.prefix.length, specifier.length - alias.suffix.length);
}

async function readTextFile(absolutePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch {
    return undefined;
  }
}

async function isFile(absolutePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function normalizeJsonConfig(contents: string): string {
  return stripTrailingCommas(stripJsonComments(contents));
}

function stripJsonComments(contents: string): string {
  let result = '';
  let inString = false;
  let quote = '';
  let escaping = false;

  for (let index = 0; index < contents.length; index += 1) {
    const current = contents[index];
    const next = contents[index + 1];

    if (inString) {
      result += current;

      if (escaping) {
        escaping = false;
      } else if (current === '\\') {
        escaping = true;
      } else if (current === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (current === '"' || current === '\'') {
      inString = true;
      quote = current;
      result += current;
      continue;
    }

    if (current === '/' && next === '/') {
      while (index < contents.length && contents[index] !== '\n') {
        index += 1;
      }
      result += '\n';
      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;
      while (index < contents.length && !(contents[index] === '*' && contents[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    result += current;
  }

  return result;
}

function stripTrailingCommas(contents: string): string {
  let result = '';
  let inString = false;
  let quote = '';
  let escaping = false;

  for (let index = 0; index < contents.length; index += 1) {
    const current = contents[index];

    if (inString) {
      result += current;

      if (escaping) {
        escaping = false;
      } else if (current === '\\') {
        escaping = true;
      } else if (current === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (current === '"' || current === '\'') {
      inString = true;
      quote = current;
      result += current;
      continue;
    }

    if (current === ',') {
      const nextSignificant = findNextSignificantCharacter(contents, index + 1);
      if (nextSignificant === '}' || nextSignificant === ']') {
        continue;
      }
    }

    result += current;
  }

  return result;
}

function findNextSignificantCharacter(contents: string, startIndex: number): string | undefined {
  for (let index = startIndex; index < contents.length; index += 1) {
    const current = contents[index];
    if (!/\s/.test(current)) {
      return current;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
