import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export interface GitAuthor {
  name: string;
  email: string;
  raw: string;
}

export interface ChangedFileResult {
  relativePath: string;
  authorChangeCount: number;
  totalChangeCount: number;
  authorRatio: number;
}

export class GitService {
  public constructor(private readonly workspaceRoot: string | undefined) {}

  public async getAuthors(query = ''): Promise<GitAuthor[]> {
    this.getWorkspaceRoot();

    const { stdout } = await this.runGit(['shortlog', '-sne', 'HEAD']);
    const authors = parseAuthors(stdout);
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return authors;
    }

    return authors.filter((author) => {
      return author.name.toLowerCase().includes(normalizedQuery)
        || author.email.toLowerCase().includes(normalizedQuery)
        || author.raw.toLowerCase().includes(normalizedQuery);
    });
  }

  public async searchChangedFiles(authors: string[], from: string, to: string): Promise<ChangedFileResult[]> {
    this.getWorkspaceRoot();

    if (!authors.length) {
      return [];
    }

    const [authorStats, totalStats] = await Promise.all([
      this.getChangedFileStats(from, to, authors),
      this.getChangedFileStats(from, to)
    ]);

    return [...authorStats.entries()]
      .filter(([relativePath]) => this.fileExists(relativePath))
      .map(([relativePath, authorChangeCount]) => {
        const totalChangeCount = totalStats.get(relativePath) ?? authorChangeCount;
        return {
          relativePath,
          authorChangeCount,
          totalChangeCount,
          authorRatio: totalChangeCount > 0 ? authorChangeCount / totalChangeCount : 0
        };
      })
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  public async getChangedFilesForPaths(
    relativePaths: string[],
    authors: string[],
    from: string,
    to: string
  ): Promise<ChangedFileResult[]> {
    this.getWorkspaceRoot();

    if (!relativePaths.length || !authors.length) {
      return [];
    }

    const uniquePaths = [...new Set(relativePaths)].filter((relativePath) => this.fileExists(relativePath));
    const [authorStats, totalStats] = await Promise.all([
      this.getChangedFileStats(from, to, authors),
      this.getChangedFileStats(from, to)
    ]);

    return uniquePaths
      .map((relativePath) => {
        const authorChangeCount = authorStats.get(relativePath) ?? 0;
        const totalChangeCount = totalStats.get(relativePath) ?? 0;
        return {
          relativePath,
          authorChangeCount,
          totalChangeCount,
          authorRatio: totalChangeCount > 0 ? authorChangeCount / totalChangeCount : 0
        };
      })
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private async getChangedFileStats(from: string, to: string, authors?: string[]): Promise<Map<string, number>> {
    const results = await Promise.all(
      (authors?.length ? authors : [undefined]).map(async (author) => {
        const authorArg = author ? [`--author=${author}`] : [];
        const { stdout } = await this.runGit([
          'log',
          ...authorArg,
          `--after=${from}`,
          `--before=${to}`,
          '--numstat',
          '--pretty=format:'
        ]);

        return parseNumstat(stdout);
      })
    );

    const stats = new Map<string, number>();
    for (const result of results) {
      for (const [relativePath, changeCount] of result) {
        stats.set(relativePath, (stats.get(relativePath) ?? 0) + changeCount);
      }
    }
    return stats;
  }

  private fileExists(relativePath: string): boolean {
    return existsSync(path.join(this.getWorkspaceRoot(), relativePath));
  }

  private async runGit(args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execFileAsync('git', args, {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
    } catch (error) {
      throw normalizeGitError(error);
    }
  }

  private getWorkspaceRoot(): string {
    if (!this.workspaceRoot) {
      throw new Error(vscode.l10n.t('Git repository not found.'));
    }

    return this.workspaceRoot;
  }
}

export function parseAuthors(stdout: string): GitAuthor[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\s+/, '').trim())
    .map((raw) => {
      const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
      return {
        name: match?.[1]?.trim() ?? raw,
        email: match?.[2]?.trim() ?? '',
        raw
      };
    });
}

export function parseChangedFiles(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseNumstat(stdout: string): Map<string, number> {
  const stats = new Map<string, number>();

  stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [added, deleted, ...pathParts] = line.split(/\t/);
      const relativePath = normalizeNumstatPath(pathParts.join('\t').trim());

      if (!relativePath) {
        return;
      }

      const addedCount = Number.parseInt(added, 10);
      const deletedCount = Number.parseInt(deleted, 10);
      const isBinaryChange = Number.isNaN(addedCount) && Number.isNaN(deletedCount);
      const changeCount = isBinaryChange
        ? 1
        : (Number.isNaN(addedCount) ? 0 : addedCount) + (Number.isNaN(deletedCount) ? 0 : deletedCount);

      stats.set(relativePath, (stats.get(relativePath) ?? 0) + changeCount);
    });

  return stats;
}

function normalizeNumstatPath(relativePath: string): string {
  return relativePath
    .replace(/\{([^{}]*?)\s=>\s([^{}]*?)\}/g, '$2')
    .replace(/^(.+?)\s=>\s(.+)$/, '$2');
}

function normalizeGitError(error: unknown): Error {
  const maybeError = error as NodeJS.ErrnoException & { stderr?: string };
  const stderr = maybeError.stderr ?? '';

  if (maybeError.code === 'ENOENT') {
    return new Error(vscode.l10n.t('Git is not installed.'));
  }

  if (stderr.includes('not a git repository')) {
    return new Error(vscode.l10n.t('Git repository not found.'));
  }

  if (stderr.toLowerCase().includes('date')) {
    return new Error(vscode.l10n.t('Please check the date range.'));
  }

  return new Error(vscode.l10n.t('An error occurred while querying Git.'));
}
