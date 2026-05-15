import * as vscode from 'vscode';
import { DependencyService } from './dependencyService';
import { FileTreeProvider } from './fileTreeProvider';
import { GitService } from './gitService';
import { SearchViewProvider } from './searchViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspaceRoot = workspaceFolder?.uri.fsPath;

  const gitService = new GitService(workspaceRoot);
  const dependencyService = new DependencyService(workspaceRoot);
  const fileTreeProvider = new FileTreeProvider(workspaceRoot);
  const dependencyTreeProvider = new FileTreeProvider(workspaceRoot, 'gitAuthorExplorer.openDependencyFile');
  let dependencySearchVersion = 0;
  const searchViewProvider = new SearchViewProvider(
    context.extensionUri,
    gitService,
    fileTreeProvider,
    dependencyTreeProvider,
    () => {
      dependencySearchVersion += 1;
    }
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SearchViewProvider.viewType, searchViewProvider),
    vscode.window.registerTreeDataProvider(FileTreeProvider.viewType, fileTreeProvider),
    vscode.window.registerTreeDataProvider('gitAuthorExplorer.dependencyTree', dependencyTreeProvider),
    vscode.commands.registerCommand('gitAuthorExplorer.openFile', async (node) => {
      if (!node?.absolutePath) {
        return;
      }

      await vscode.window.showTextDocument(vscode.Uri.file(node.absolutePath));

      const criteria = searchViewProvider.getLastSearchCriteria();
      if (!criteria) {
        return;
      }

      const currentSearchVersion = ++dependencySearchVersion;
      dependencyTreeProvider.setFilePaths([]);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: vscode.l10n.t('Searching dependency files...')
        },
        async () => {
          const dependencies = await dependencyService.findDependencies(node.relativePath);
          const files = await gitService.getChangedFilesForPaths(
            dependencies,
            criteria.authors,
            criteria.from,
            criteria.to
          );

          if (currentSearchVersion !== dependencySearchVersion) {
            return;
          }

          dependencyTreeProvider.setChangedFiles(files);

          if (!files.length) {
            vscode.window.showInformationMessage(vscode.l10n.t('No project dependencies found for this file.'));
          }
        }
      );
    }),
    vscode.commands.registerCommand('gitAuthorExplorer.openDependencyFile', async (node) => {
      if (!node?.absolutePath) {
        return;
      }

      await vscode.window.showTextDocument(vscode.Uri.file(node.absolutePath));
    }),
    vscode.commands.registerCommand('gitAuthorExplorer.refresh', () => {
      fileTreeProvider.refresh();
      dependencyTreeProvider.refresh();
    })
  );
}

export function deactivate(): void {}
