import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ChangedFileResult } from './gitService';

export interface FileTreeNode {
  label: string;
  type: 'file' | 'directory';
  relativePath: string;
  absolutePath: string;
  authorRatio?: number;
  authorChangeCount?: number;
  totalChangeCount?: number;
  children?: FileTreeNode[];
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeNode> {
  public static readonly viewType = 'gitAuthorExplorer.fileTree';

  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<FileTreeNode | undefined | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private nodes: FileTreeNode[] = [];

  public constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly fileCommand = 'gitAuthorExplorer.openFile'
  ) {}

  public refresh(nodes = this.nodes): void {
    this.nodes = nodes;
    this.onDidChangeTreeDataEmitter.fire();
  }

  public setFilePaths(relativePaths: string[]): void {
    this.refresh(buildFileTree(relativePaths, this.workspaceRoot));
  }

  public setChangedFiles(files: ChangedFileResult[]): void {
    this.refresh(buildFileTree(files, this.workspaceRoot));
  }

  public getTreeItem(element: FileTreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'directory'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.resourceUri = vscode.Uri.file(element.absolutePath);
    item.contextValue = element.type;

    if (element.type === 'file') {
      item.description = typeof element.authorRatio === 'number' ? formatRatio(element.authorRatio) : undefined;
      item.tooltip = typeof element.authorRatio === 'number'
        ? `${element.relativePath}\n${vscode.l10n.t(
          'Selected author change ratio: {0} ({1}/{2} lines)',
          formatRatio(element.authorRatio),
          element.authorChangeCount ?? 0,
          element.totalChangeCount ?? 0
        )}`
        : element.relativePath;
      item.command = {
        command: this.fileCommand,
        title: vscode.l10n.t('Open File'),
        arguments: [element]
      };
    }

    return item;
  }

  public getChildren(element?: FileTreeNode): FileTreeNode[] {
    return element?.children ?? this.nodes;
  }
}

export function buildFileTree(files: string[] | ChangedFileResult[], workspaceRoot = ''): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];
  const changedFiles = files.map((file) => typeof file === 'string' ? { relativePath: file } : file);

  for (const file of dedupeChangedFiles(changedFiles).sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
    const { relativePath } = file;
    const segments = relativePath.split('/').filter(Boolean);
    let siblings = rootNodes;
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const type = index === segments.length - 1 ? 'file' : 'directory';
      let node = siblings.find((candidate) => candidate.label === segment && candidate.type === type);

      if (!node) {
        node = {
          label: segment,
          type,
          relativePath: currentPath,
          absolutePath: path.join(workspaceRoot, currentPath),
          authorRatio: type === 'file' ? file.authorRatio : undefined,
          authorChangeCount: type === 'file' ? file.authorChangeCount : undefined,
          totalChangeCount: type === 'file' ? file.totalChangeCount : undefined,
          children: type === 'directory' ? [] : undefined
        };
        siblings.push(node);
      } else if (type === 'file') {
        node.authorRatio = file.authorRatio;
        node.authorChangeCount = file.authorChangeCount;
        node.totalChangeCount = file.totalChangeCount;
      }

      siblings = node.children ?? [];
    });
  }

  sortNodes(rootNodes);
  return rootNodes;
}

function sortNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    return a.label.localeCompare(b.label);
  });

  nodes.forEach((node) => sortNodes(node.children ?? []));
}

function dedupeChangedFiles(files: Array<Partial<ChangedFileResult> & { relativePath: string }>): Array<Partial<ChangedFileResult> & { relativePath: string }> {
  const unique = new Map<string, Partial<ChangedFileResult> & { relativePath: string }>();

  for (const file of files) {
    unique.set(file.relativePath, file);
  }

  return [...unique.values()];
}

function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
