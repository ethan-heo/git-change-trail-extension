import * as path from 'node:path';
import * as vscode from 'vscode';
import { CommitEntry, DateFilter, GitService, HistoryFilter } from './gitService';

type HistoryTreeNode = CommitNode | MessageNode;

export interface CommitNode {
  type: 'commit';
  entry: CommitEntry;
}

interface MessageNode {
  type: 'message';
  label: string;
}

export class CommitHistoryProvider implements vscode.TreeDataProvider<HistoryTreeNode> {
  public static readonly viewType = 'gitFileExplorer.commitHistory';

  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<HistoryTreeNode | undefined | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private readonly onDidSelectCommitEmitter = new vscode.EventEmitter<CommitEntry>();
  public readonly onDidSelectCommit = this.onDidSelectCommitEmitter.event;

  private treeView: vscode.TreeView<HistoryTreeNode> | undefined;
  private currentFilePath: string | undefined;
  private pinned = false;
  private dateFilter: DateFilter = {};
  private authorFilter: string[] = [];
  private commits: CommitEntry[] = [];
  private message = vscode.l10n.t('Open a file to show commit history.');

  public constructor(private readonly gitService: GitService) {}

  public setTreeView(treeView: vscode.TreeView<HistoryTreeNode>): void {
    this.treeView = treeView;
    this.updateTreeDescription();
  }

  public async loadFile(filePath: string, options: { force?: boolean } = {}): Promise<void> {
    if (this.pinned && !options.force) {
      return;
    }

    this.currentFilePath = filePath;
    this.commits = [];
    this.message = vscode.l10n.t('Loading commit history...');
    this.updateTreeDescription();
    this.refresh();

    try {
      this.commits = await this.gitService.getFileHistory(filePath, this.getHistoryFilter());
      this.message = this.commits.length
        ? ''
        : vscode.l10n.t('This file has no commit history.');
    } catch (error) {
      this.message = error instanceof Error ? error.message : vscode.l10n.t('An error occurred while querying Git.');
      vscode.window.showErrorMessage(this.message);
    }

    this.updateTreeDescription();
    this.refresh();
  }

  public clear(message = vscode.l10n.t('Open a file to show commit history.')): void {
    if (this.pinned) {
      return;
    }

    this.currentFilePath = undefined;
    this.commits = [];
    this.message = message;
    this.updateTreeDescription();
    this.refresh();
  }

  public async setDateFilter(filter: DateFilter): Promise<void> {
    this.dateFilter = filter;
    this.updateTreeDescription();

    if (this.currentFilePath) {
      await this.loadFile(this.currentFilePath, { force: true });
    }
  }

  public async setAuthorFilter(authors: string[]): Promise<void> {
    this.authorFilter = [...authors];
    this.updateTreeDescription();

    if (this.currentFilePath) {
      await this.loadFile(this.currentFilePath, { force: true });
    }
  }

  public clearFilters(): void {
    this.dateFilter = {};
    this.authorFilter = [];
    this.updateTreeDescription();
  }

  public async togglePin(): Promise<void> {
    this.pinned = !this.pinned;
    this.updateTreeDescription();

    await vscode.commands.executeCommand('setContext', 'gitFileExplorer.commitHistoryPinned', this.pinned);

    if (!this.pinned) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor?.document.uri.scheme === 'file') {
        await this.loadFile(activeEditor.document.uri.fsPath, { force: true });
      }
    }
  }

  public unpin(): void {
    this.pinned = false;
    this.updateTreeDescription();
    void vscode.commands.executeCommand('setContext', 'gitFileExplorer.commitHistoryPinned', false);
  }

  public selectCommit(entry: CommitEntry): void {
    this.onDidSelectCommitEmitter.fire(entry);
  }

  public getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }

  public getDateFilter(): DateFilter {
    return { ...this.dateFilter };
  }

  public getAuthorFilter(): string[] {
    return [...this.authorFilter];
  }

  public getHistoryFilter(): HistoryFilter {
    return {
      ...this.dateFilter,
      ...(this.authorFilter.length ? { authors: [...this.authorFilter] } : {})
    };
  }

  public async getAvailableAuthors(): Promise<string[]> {
    if (!this.currentFilePath) {
      return [];
    }

    return this.gitService.getFileAuthors(this.currentFilePath, this.dateFilter);
  }

  public async getCommitEntry(hash: string, filePath?: string): Promise<CommitEntry | undefined> {
    const targetFilePath = filePath ?? this.currentFilePath;

    if (!targetFilePath) {
      return undefined;
    }

    return this.commits.find((entry) => entry.hash === hash)
      ?? this.gitService.getCommitEntry(hash, targetFilePath, this.getHistoryFilter());
  }

  public getTreeItem(element: HistoryTreeNode): vscode.TreeItem {
    if (element.type === 'message') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'message';
      return item;
    }

    const label = `#${element.entry.index}  ${element.entry.date.slice(0, 10)}  ${element.entry.subject}`;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.description = element.entry.hash.slice(0, 7);
    item.tooltip = `${element.entry.hash}\n${element.entry.date}\n${element.entry.subject}`;
    item.contextValue = 'commit';
    item.command = {
      command: 'gitFileExplorer.selectCommit',
      title: vscode.l10n.t('Select Commit'),
      arguments: [element.entry]
    };
    return item;
  }

  public getChildren(): HistoryTreeNode[] {
    if (this.commits.length) {
      return this.commits.map((entry) => ({ type: 'commit', entry }));
    }

    return [{ type: 'message', label: this.message }];
  }

  private refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  private updateTreeDescription(): void {
    if (!this.treeView) {
      return;
    }

    const parts = [
      this.pinned ? vscode.l10n.t('Pinned') : undefined,
      formatDateFilter(this.dateFilter),
      formatAuthorFilter(this.authorFilter),
      this.currentFilePath ? path.basename(this.currentFilePath) : undefined
    ].filter(Boolean);

    this.treeView.description = parts.join(' | ');
  }
}

function formatDateFilter(filter: DateFilter): string | undefined {
  if (!filter.from && !filter.to) {
    return undefined;
  }

  return `${filter.from || vscode.l10n.t('Any')} ~ ${filter.to || vscode.l10n.t('Any')}`;
}

function formatAuthorFilter(authors: string[]): string | undefined {
  if (!authors.length) {
    return undefined;
  }

  if (authors.length === 1) {
    return authors[0];
  }

  return vscode.l10n.t('{0} authors', authors.length);
}
