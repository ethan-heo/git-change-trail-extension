import * as vscode from 'vscode';
import {
  CommitFilesProvider,
  createRevisionUri,
  getFileName
} from './commitFilesProvider';
import { CommitHistoryProvider } from './commitHistoryProvider';
import { GitService } from './gitService';
import { RevisionContentProvider } from './revisionContentProvider';

type DateFilter = {
  from?: string;
  to?: string;
};

type DateFilterPick =
  | { action: 'clear' }
  | { action: 'custom' }
  | { action: 'preset'; days: number };

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspaceRoot = workspaceFolder?.uri.fsPath;

  const gitService = new GitService(workspaceRoot);
  const commitHistoryProvider = new CommitHistoryProvider(gitService);
  const commitFilesProvider = new CommitFilesProvider(gitService);
  const revisionContentProvider = new RevisionContentProvider(gitService);

  const commitHistoryTree = vscode.window.createTreeView(CommitHistoryProvider.viewType, {
    treeDataProvider: commitHistoryProvider
  });
  const commitFilesTree = vscode.window.createTreeView(CommitFilesProvider.viewType, {
    treeDataProvider: commitFilesProvider
  });

  commitHistoryProvider.setTreeView(commitHistoryTree);
  commitFilesProvider.setTreeView(commitFilesTree);

  context.subscriptions.push(
    commitHistoryTree,
    commitFilesTree,
    vscode.workspace.registerTextDocumentContentProvider(RevisionContentProvider.scheme, revisionContentProvider),
    commitHistoryProvider.onDidSelectCommit(async (entry) => {
      commitFilesProvider.clearCompareState();
      await commitFilesProvider.loadCommit(entry);
    }),
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) {
        commitHistoryProvider.clear();
        return;
      }

      if (editor.document.uri.scheme !== 'file') {
        return;
      }

      await commitHistoryProvider.loadFile(editor.document.uri.fsPath);
    }),
    vscode.commands.registerCommand('gitFileExplorer.showHistory', async (uri?: vscode.Uri) => {
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;

      if (!targetUri || targetUri.scheme !== 'file') {
        vscode.window.showInformationMessage(vscode.l10n.t('Open a file to show commit history.'));
        return;
      }

      commitHistoryProvider.unpin();
      commitFilesProvider.clearCompareState();
      await commitHistoryProvider.loadFile(targetUri.fsPath, { force: true });
    }),
    vscode.commands.registerCommand('gitFileExplorer.selectCommit', async (entry) => {
      commitHistoryProvider.selectCommit(entry);
    }),
    vscode.commands.registerCommand('gitFileExplorer.filterByDate', async () => {
      const filter = await promptDateFilter(commitHistoryProvider.getDateFilter());

      if (!filter) {
        return;
      }

      await commitHistoryProvider.setDateFilter(filter);
    }),
    vscode.commands.registerCommand('gitFileExplorer.filterByAuthor', async () => {
      const authors = await promptAuthorFilter(
        await commitHistoryProvider.getAvailableAuthors(),
        commitHistoryProvider.getAuthorFilter()
      );

      if (!authors) {
        return;
      }

      await commitHistoryProvider.setAuthorFilter(authors);
    }),
    vscode.commands.registerCommand('gitFileExplorer.togglePin', async () => {
      await commitHistoryProvider.togglePin();
    }),
    vscode.commands.registerCommand('gitFileExplorer.openFileAtCommit', async (node) => {
      await commitFilesProvider.openFileAtCommit(node);
    }),
    vscode.commands.registerCommand('gitFileExplorer.showFileHistoryFromCommitFile', async (node) => {
      await showFileHistoryFromCommitFile(node, commitHistoryProvider, commitFilesProvider);
    }),
    vscode.commands.registerCommand('gitFileExplorer.diffWithPrevious', async (node) => {
      await openAdjacentDiff('prev', node, gitService, commitHistoryProvider, commitFilesProvider);
    }),
    vscode.commands.registerCommand('gitFileExplorer.diffWithNext', async (node) => {
      await openAdjacentDiff('next', node, gitService, commitHistoryProvider, commitFilesProvider);
    })
  );

  void vscode.commands.executeCommand('setContext', 'gitFileExplorer.commitHistoryPinned', false);

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri.scheme === 'file') {
    void commitHistoryProvider.loadFile(activeEditor.document.uri.fsPath);
  }
}

export function deactivate(): void {}

async function promptDateFilter(currentFilter: DateFilter): Promise<DateFilter | undefined> {
  const selected = await promptDateFilterAction(currentFilter);

  if (!selected) {
    return undefined;
  }

  if (selected.action === 'clear') {
    vscode.window.showInformationMessage(vscode.l10n.t('Date filter cleared.'));
    return {};
  }

  if (selected.action === 'preset') {
    return createRecentDateFilter(selected.days);
  }

  const from = await vscode.window.showInputBox({
    title: vscode.l10n.t('Filter Commit History'),
    prompt: vscode.l10n.t('From date (YYYY-MM-DD). Leave empty for no lower bound.'),
    placeHolder: 'YYYY-MM-DD',
    validateInput: validateDateInput
  });

  if (from === undefined) {
    return undefined;
  }

  const to = await vscode.window.showInputBox({
    title: vscode.l10n.t('Filter Commit History'),
    prompt: vscode.l10n.t('To date (YYYY-MM-DD). Leave empty for no upper bound.'),
    placeHolder: 'YYYY-MM-DD',
    validateInput: validateDateInput
  });

  if (to === undefined) {
    return undefined;
  }

  if (from && to && from > to) {
    vscode.window.showErrorMessage(vscode.l10n.t('Please check the date range.'));
    return undefined;
  }

  return {
    from: from || undefined,
    to: to || undefined
  };
}

async function promptDateFilterAction(currentFilter: DateFilter): Promise<DateFilterPick | undefined> {
  const hasDateFilter = Boolean(currentFilter.from || currentFilter.to);
  const items: Array<vscode.QuickPickItem & DateFilterPick> = [];

  if (hasDateFilter) {
    items.push({
      label: vscode.l10n.t('Clear Date Filter'),
      description: formatPromptDateFilter(currentFilter),
      action: 'clear'
    });
  }

  items.push(
    {
      label: vscode.l10n.t('Enter Date Range'),
      description: vscode.l10n.t('Set from/to dates manually'),
      action: 'custom'
    },
    {
      label: vscode.l10n.t('Recent 7 Days'),
      description: formatPromptDateFilter(createRecentDateFilter(7)),
      action: 'preset',
      days: 7
    },
    {
      label: vscode.l10n.t('Recent 30 Days'),
      description: formatPromptDateFilter(createRecentDateFilter(30)),
      action: 'preset',
      days: 30
    }
  );

  const selected = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Filter Commit History'),
    placeHolder: hasDateFilter
      ? vscode.l10n.t('Current filter: {0}', formatPromptDateFilter(currentFilter))
      : vscode.l10n.t('Choose a date filter option')
  });

  return selected;
}

async function promptAuthorFilter(
  availableAuthors: string[],
  currentAuthors: string[]
): Promise<string[] | undefined> {
  if (!availableAuthors.length) {
    vscode.window.showInformationMessage(vscode.l10n.t('No authors found for this file.'));
    return undefined;
  }

  const currentAuthorSet = new Set(currentAuthors);
  const items = availableAuthors.map((author) => ({
    label: author,
    picked: currentAuthorSet.has(author)
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Filter Commit History by Author'),
    placeHolder: currentAuthors.length
      ? vscode.l10n.t('Selected authors: {0}', currentAuthors.length)
      : vscode.l10n.t('Choose authors to include'),
    canPickMany: true
  });

  if (!selected) {
    return undefined;
  }

  if (!selected.length && currentAuthors.length) {
    vscode.window.showInformationMessage(vscode.l10n.t('Author filter cleared.'));
  }

  return selected.map((item) => item.label);
}

function createRecentDateFilter(days: number): DateFilter {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  return {
    from: formatDate(from),
    to: formatDate(to)
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPromptDateFilter(filter: DateFilter): string {
  return `${filter.from || vscode.l10n.t('Any')} ~ ${filter.to || vscode.l10n.t('Any')}`;
}

function validateDateInput(value: string): string | undefined {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return vscode.l10n.t('Use YYYY-MM-DD format.');
}

async function showFileHistoryFromCommitFile(
  node: unknown,
  commitHistoryProvider: CommitHistoryProvider,
  commitFilesProvider: CommitFilesProvider
): Promise<void> {
  if (!isFileTreeNode(node)) {
    return;
  }

  commitHistoryProvider.unpin();
  commitHistoryProvider.clearFilters();
  commitFilesProvider.clearCompareState();
  await commitHistoryProvider.loadFile(node.relativePath, { force: true });
  await vscode.commands.executeCommand(`${CommitHistoryProvider.viewType}.focus`);
}

async function openAdjacentDiff(
  direction: 'prev' | 'next',
  node: unknown,
  gitService: GitService,
  commitHistoryProvider: CommitHistoryProvider,
  commitFilesProvider: CommitFilesProvider
): Promise<void> {
  const target = getDiffTarget(node, commitFilesProvider);

  if (!target) {
    return;
  }

  const current = await gitService.getCommitEntry(
    target.hash,
    target.relativePath,
    commitHistoryProvider.getHistoryFilter()
  );
  const adjacent = await gitService.getAdjacentCommit(
    target.hash,
    target.relativePath,
    direction,
    commitHistoryProvider.getHistoryFilter()
  );

  if (!current || !adjacent) {
    vscode.window.showInformationMessage(
      direction === 'prev'
        ? vscode.l10n.t('No previous commit exists for this file.')
        : vscode.l10n.t('No next commit exists for this file.')
    );
    return;
  }

  const older = direction === 'prev' ? adjacent : current;
  const newer = direction === 'prev' ? current : adjacent;
  const leftUri = createRevisionUri(older.hash, target.relativePath);
  const rightUri = createRevisionUri(newer.hash, target.relativePath);
  const title = `${getFileName(target.relativePath)}: #${older.index} ↔ #${newer.index}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
  commitFilesProvider.setCompareState(older, newer);
}

function getDiffTarget(
  node: unknown,
  commitFilesProvider: CommitFilesProvider
): { hash: string; relativePath: string } | undefined {
  if (!isFileTreeNode(node)) {
    return undefined;
  }

  const selectedCommit = commitFilesProvider.getSelectedCommit();

  if (!selectedCommit) {
    return undefined;
  }

  return {
    hash: selectedCommit.hash,
    relativePath: node.relativePath
  };
}

function isFileTreeNode(node: unknown): node is { type: 'file'; relativePath: string } {
  return Boolean(
    node
    && typeof node === 'object'
    && (node as { type?: unknown }).type === 'file'
    && typeof (node as { relativePath?: unknown }).relativePath === 'string'
  );
}
