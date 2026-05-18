import * as path from 'node:path';
import * as vscode from 'vscode';
import { CommitEntry, GitService } from './gitService';

export interface FileTreeNode {
  label: string;
  type: 'file' | 'directory';
  relativePath: string;
  children?: FileTreeNode[];
}

type CommitFilesTreeNode = FileTreeNode | MessageNode;

interface MessageNode {
  type: 'message';
  label: string;
}

export class CommitFilesProvider implements vscode.TreeDataProvider<CommitFilesTreeNode> {
  public static readonly viewType = 'gitFileExplorer.commitFiles';

  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<CommitFilesTreeNode | undefined | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private treeView: vscode.TreeView<CommitFilesTreeNode> | undefined;
  private nodes: FileTreeNode[] = [];
  private selectedCommit: CommitEntry | undefined;
  private message = vscode.l10n.t('Select a commit to show changed files.');

  public constructor(private readonly gitService: GitService) {}

  public setTreeView(treeView: vscode.TreeView<CommitFilesTreeNode>): void {
    this.treeView = treeView;
    this.updateTreeDescription();
  }

  public async loadCommit(entry: CommitEntry): Promise<void> {
    this.selectedCommit = entry;
    this.nodes = [];
    this.message = vscode.l10n.t('Loading changed files...');
    this.updateTreeDescription();
    this.refresh();

    try {
      const files = await this.gitService.getCommitFiles(entry.hash);
      this.nodes = buildFileTree(files);
      this.message = this.nodes.length
        ? ''
        : vscode.l10n.t('This commit has no changed files.');
    } catch (error) {
      this.message = error instanceof Error ? error.message : vscode.l10n.t('An error occurred while querying Git.');
      vscode.window.showErrorMessage(this.message);
    }

    this.updateTreeDescription();
    this.refresh();
  }

  public setCompareState(a: CommitEntry, b: CommitEntry): void {
    if (this.treeView) {
      this.treeView.description = `${this.getSelectedCommitDescription()} comparing: #${a.index} ↔ #${b.index}`;
    }
  }

  public clearCompareState(): void {
    this.updateTreeDescription();
  }

  public async openFileAtCommit(node: FileTreeNode): Promise<void> {
    if (!this.selectedCommit || node.type !== 'file') {
      return;
    }

    const uri = createRevisionUri(this.selectedCommit.hash, node.relativePath);
    await vscode.window.showTextDocument(uri, { preview: true, preserveFocus: false });
  }

  public getSelectedCommit(): CommitEntry | undefined {
    return this.selectedCommit;
  }

  public getTreeItem(element: CommitFilesTreeNode): vscode.TreeItem {
    if (element.type === 'message') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'message';
      return item;
    }

    const item = new vscode.TreeItem(
      element.label,
      element.type === 'directory'
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );
    item.contextValue = element.type;
    item.tooltip = element.relativePath;
    item.resourceUri = createExplorerIconResourceUri(element.relativePath);

    if (element.type === 'file') {
      item.command = {
        command: 'gitFileExplorer.openFileAtCommit',
        title: vscode.l10n.t('Open File at Commit'),
        arguments: [element]
      };
    }

    return item;
  }

  public getChildren(element?: CommitFilesTreeNode): CommitFilesTreeNode[] {
    if (element?.type === 'directory') {
      return element.children ?? [];
    }

    if (element) {
      return [];
    }

    if (this.nodes.length) {
      return this.nodes;
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

    this.treeView.description = this.getSelectedCommitDescription();
  }

  private getSelectedCommitDescription(): string {
    return this.selectedCommit ? `#${this.selectedCommit.index}` : '';
  }
}

export function buildFileTree(relativePaths: string[]): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];

  for (const relativePath of [...new Set(relativePaths)].sort((a, b) => a.localeCompare(b))) {
    const segments = relativePath.split('/').filter(Boolean);
    let siblings = rootNodes;
    let currentPath = '';

    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const type = index === segments.length - 1 ? 'file' : 'directory';
      let node = siblings.find((candidate) => candidate.label === segment && candidate.type === type);

      if (!node) {
        node = {
          label: segment,
          type,
          relativePath: currentPath,
          children: type === 'directory' ? [] : undefined
        };
        siblings.push(node);
      }

      siblings = node.children ?? [];
    }
  }

  sortNodes(rootNodes);
  return rootNodes;
}

export function createRevisionUri(hash: string, relativePath: string): vscode.Uri {
  const displayPath = createRevisionDisplayPath(hash, relativePath);
  const query = new URLSearchParams({ path: relativePath }).toString();

  return vscode.Uri.from({
    scheme: 'gitrevision',
    authority: hash,
    path: `/${displayPath}`,
    query
  });
}

export function parseRevisionUri(uri: vscode.Uri): { hash: string; relativePath: string } | undefined {
  if (uri.scheme !== 'gitrevision' || !uri.authority) {
    return undefined;
  }

  const relativePath = new URLSearchParams(uri.query).get('path');

  return {
    hash: uri.authority,
    relativePath: relativePath ?? uri.path.replace(/^\/+/, '')
  };
}

function createRevisionDisplayPath(hash: string, relativePath: string): string {
  const directory = path.posix.dirname(relativePath);
  const fileName = path.posix.basename(relativePath);
  const parsed = path.posix.parse(fileName);
  const revisionLabel = `Git ${hash.slice(0, 7)}`;
  const displayFileName = parsed.ext
    ? `${parsed.name} (${revisionLabel})${parsed.ext}`
    : `${fileName} (${revisionLabel})`;

  return directory === '.' ? displayFileName : `${directory}/${displayFileName}`;
}

function sortNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    return a.label.localeCompare(b.label);
  });

  for (const node of nodes) {
    sortNodes(node.children ?? []);
  }
}

export function getFileName(relativePath: string): string {
  return path.basename(relativePath);
}

function createExplorerIconResourceUri(relativePath: string): vscode.Uri | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    return undefined;
  }

  return vscode.Uri.joinPath(workspaceFolder.uri, ...relativePath.split('/').filter(Boolean));
}
