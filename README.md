# Git Change Trail

[한국어](README.ko.md)

## Introduction

Git Change Trail is a VS Code extension that shows the commit history of the file you are currently editing. Click a commit to see which files changed, open any file at that revision, and compare revisions side by side — all from the sidebar without leaving your editor.

## Features

- **Automatic tracking** — the Commit History panel updates as you switch editor tabs.
- **Commit history list** — commits are listed newest-first with sequential numbering (`#1`, `#2`, …).
- **Changed files tree** — click a commit to see the files it changed in a directory tree.
- **Revision file view** — click a file in the tree to open its content at that exact commit, read-only.
- **Diff between commits** — use the inline buttons on each file to compare it with the previous or next commit.
- **Full file history** — jump to the complete history of any file directly from the changed-files tree.
- **Date filter** — narrow the history to a date range using presets or manual input.
- **Author filter** — show only commits from selected authors.
- **Pin** — lock the panel to the current file so it does not update when you switch tabs.

## Requirements

- VS Code 1.90.0 or later
- Git CLI installed and available on `PATH`

This extension works when a Git repository is open in the VS Code workspace.

## Usage

### Viewing commit history

Open any file tracked by Git. The **Commit History** panel on the sidebar updates automatically to show that file's history.

To load history for a file that is not yet open, right-click it in the Explorer and choose **Show Commit History**.

### Exploring a commit

Click any commit in the Commit History panel. The **Commit Files** panel shows the files that were changed in that commit as a directory tree.

Click a file in the tree to open its content at that revision. The tab title includes the short commit hash so you can tell it apart from the live file.

### Comparing revisions

Each file item in the Commit Files panel has two inline action buttons:

| Button | Action |
|--------|--------|
| Diff with Previous | Opens a diff against the commit just before this one |
| Diff with Next | Opens a diff against the commit just after this one |

While a diff is open, the Commit Files panel title shows the two commits being compared, for example `comparing: #2 ↔ #3`.

### Viewing the full history of a file

In the Commit Files panel, click the **Show Full File History** button on a file item. The Commit History panel reloads with the complete history of that file, clearing any active filters.

### Filtering

The Commit History panel title bar provides three buttons:

| Icon | Action |
|------|--------|
| Calendar | Open the date filter. Choose a preset (`Last 7 days`, `Last 30 days`) or enter a custom `From` / `To` range in `YYYY-MM-DD` format. Leave a field blank to set no limit on that end. Select **Clear filter** to remove the filter. |
| Account | Open the author filter. Select one or more authors from the list of contributors to the current file. Deselect all to remove the filter. |
| Pin | Lock the panel to the current file. The history will not change when you switch tabs. Click again to resume automatic tracking. |

When filters are active, the panel title shows the applied range or author count.

### Keyboard shortcut

There is no default keybinding. You can assign one to the **Show Commit History** command in VS Code **Keyboard Shortcuts**.

## Development Setup

```bash
pnpm install
pnpm run compile
```

Open this repository in VS Code and run the **Run Extension** debug configuration to launch the Extension Development Host.

Useful commands:

```bash
pnpm run compile      # one-off TypeScript build
pnpm run watch        # incremental build on save
pnpm run lint         # ESLint
pnpm run check        # lint + compile
pnpm run package:vsix # build .vsix installer
```

## Contributing

Issues, bug reports, feature suggestions, and documentation improvements are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Run `pnpm run check` and make sure it passes.
4. Open a pull request describing the intent of the change and how you verified it.

When reporting a bug, include your VS Code version, operating system, reproduction steps, expected behavior, and actual behavior.

## License

This project is free to use, but redistribution of the same or substantially similar software is not permitted. See `LICENSE` for details.
