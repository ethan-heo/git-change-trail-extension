import * as vscode from 'vscode';
import { parseRevisionUri } from './commitFilesProvider';
import { GitService } from './gitService';

export class RevisionContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'gitrevision';

  public constructor(private readonly gitService: GitService) {}

  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const revision = parseRevisionUri(uri);

    if (!revision) {
      return '';
    }

    return this.gitService.getFileContentAtCommit(revision.hash, revision.relativePath);
  }
}
