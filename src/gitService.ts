import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export interface CommitEntry {
  hash: string;
  date: string;
  authorName: string;
  authorEmail: string;
  subject: string;
  index: number;
}

export interface DateFilter {
  from?: string;
  to?: string;
}

export interface HistoryFilter extends DateFilter {
  authors?: string[];
}

export class GitService {
  public constructor(private readonly workspaceRoot: string | undefined) {}

  public async getFileHistory(filePath: string, filter?: HistoryFilter): Promise<CommitEntry[]> {
    const relativePath = this.toWorkspaceRelativePath(filePath);
    const args = [
      'log',
      '--follow',
      '--format=%H%x00%ai%x00%an%x00%ae%x00%s',
      ...filter?.from ? [`--after=${filter.from}`] : [],
      ...filter?.to ? [`--before=${filter.to}`] : [],
      '--',
      relativePath
    ];
    const { stdout } = await this.runGit(args);

    return applyAuthorFilter(parseCommitHistory(stdout), filter?.authors);
  }

  public async getFileAuthors(filePath: string, filter?: DateFilter): Promise<string[]> {
    const commits = await this.getFileHistory(filePath, filter);
    const authors = new Set(commits.map(formatAuthor).filter(Boolean));
    return [...authors].sort((a, b) => a.localeCompare(b));
  }

  public async getCommitFiles(hash: string): Promise<string[]> {
    const { stdout } = await this.runGit(['diff-tree', '--no-commit-id', '-r', '--name-only', hash]);
    const files = parseChangedFiles(stdout);

    if (files.length) {
      return files;
    }

    const fallback = await this.runGit(['show', '--name-only', '--format=', hash]);
    return parseChangedFiles(fallback.stdout);
  }

  public async getFileContentAtCommit(hash: string, relativePath: string): Promise<string> {
    const normalizedPath = normalizeRelativePath(relativePath);
    const { stdout } = await this.runGit(['show', `${hash}:${normalizedPath}`]);
    return stdout;
  }

  public async getAdjacentCommit(
    hash: string,
    filePath: string,
    direction: 'prev' | 'next',
    filter?: HistoryFilter
  ): Promise<CommitEntry | undefined> {
    const commits = await this.getFileHistory(filePath, filter);
    const currentIndex = commits.findIndex((entry) => entry.hash === hash);

    if (currentIndex < 0) {
      return undefined;
    }

    const adjacentIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    return commits[adjacentIndex];
  }

  public async getCommitEntry(hash: string, filePath: string, filter?: HistoryFilter): Promise<CommitEntry | undefined> {
    const commits = await this.getFileHistory(filePath, filter);
    return commits.find((entry) => entry.hash === hash);
  }

  public toWorkspaceRelativePath(filePath: string): string {
    const workspaceRoot = this.getWorkspaceRoot();
    const normalizedFilePath = normalizeRelativePath(filePath);

    if (!path.isAbsolute(filePath)) {
      return normalizedFilePath;
    }

    return normalizeRelativePath(path.relative(workspaceRoot, filePath));
  }

  private async runGit(args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execFileAsync('git', args, {
        cwd: this.getWorkspaceRoot(),
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

export function parseCommitHistory(stdout: string): CommitEntry[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const [hash, date, authorName, authorEmail, subject] = line.split('\0');
      return {
        hash,
        date,
        authorName: authorName ?? '',
        authorEmail: authorEmail ?? '',
        subject: subject ?? '',
        index: index + 1
      };
    })
    .filter((entry) => entry.hash && entry.date);
}

export function formatAuthor(entry: Pick<CommitEntry, 'authorName' | 'authorEmail'>): string {
  if (entry.authorName && entry.authorEmail) {
    return `${entry.authorName} <${entry.authorEmail}>`;
  }

  return entry.authorName || entry.authorEmail;
}

function applyAuthorFilter(commits: CommitEntry[], authors: string[] | undefined): CommitEntry[] {
  if (!authors?.length) {
    return commits;
  }

  const selectedAuthors = new Set(authors);
  return commits
    .filter((entry) => selectedAuthors.has(formatAuthor(entry)))
    .map((entry, index) => ({ ...entry, index: index + 1 }));
}

export function parseChangedFiles(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizeGitError(error: unknown): Error {
  const maybeError = error as NodeJS.ErrnoException & { stderr?: string; message?: string };
  const stderr = maybeError.stderr ?? '';
  const normalizedStderr = stderr.toLowerCase();

  if (maybeError.code === 'ENOENT') {
    return new Error(vscode.l10n.t('Git is not installed.'));
  }

  if (normalizedStderr.includes('not a git repository')) {
    return new Error(vscode.l10n.t('Git repository not found.'));
  }

  if (
    normalizedStderr.includes('does not exist')
    || normalizedStderr.includes('unknown revision')
    || normalizedStderr.includes('exists on disk, but not in')
  ) {
    return new Error(vscode.l10n.t('The file does not exist in this commit.'));
  }

  if (normalizedStderr.includes('date')) {
    return new Error(vscode.l10n.t('Please check the date range.'));
  }

  return new Error(vscode.l10n.t('An error occurred while querying Git.'));
}
