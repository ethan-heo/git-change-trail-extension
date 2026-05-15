# Git Author Explorer

[한국어](README.ko.md)

Git Author Explorer is a VS Code extension for exploring files changed by Git authors within a date range. It helps you select one or more authors, review the files they changed, and inspect related dependency files from the VS Code side bar.

## Features

- Search Git authors by name or email.
- Select and remove multiple authors.
- Filter changed files by From/To date range.
- Browse changed files in a directory tree.
- Open selected files in the VS Code editor.
- Explore dependency files related to a selected file.
- Show helpful states for missing Git repositories, missing Git CLI, and empty results.
- Support English and Korean localization.

## Requirements

- VS Code 1.90.0 or later
- Git CLI
- Node.js 20 or later recommended
- pnpm 10.19.0 or later recommended

This extension works when a Git repository is opened in the VS Code workspace.

## Getting Started

```bash
pnpm install
pnpm run compile
```

Open this repository in VS Code and run the `Run Extension` debug configuration to launch the Extension Development Host.

## Development Commands

```bash
pnpm run compile
pnpm run watch
pnpm run lint
pnpm run check
pnpm run package:vsix
```

- `compile`: Builds TypeScript into `dist/`.
- `watch`: Runs the TypeScript compiler in watch mode.
- `lint`: Lints TypeScript files in `src/`.
- `check`: Runs the compile check.
- `package:vsix`: Builds a `.vsix` package for manual Marketplace upload.

## Project Structure

```text
src/
  extension.ts            Extension entry point and VS Code command registration
  gitService.ts           Git CLI execution and output parsing
  searchViewProvider.ts   Side bar search webview
  fileTreeProvider.ts     Changed file tree view
  dependencyService.ts    Related dependency file discovery
l10n/                     Runtime localization bundles
docs/                     Requirements, design, and release planning docs
resources/                Extension icons and static resources
```

## Contributing

Issues, bug reports, feature suggestions, and documentation improvements are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Run `pnpm run check`.
4. Open a pull request with the intent of the change and verification notes.

When reporting a bug, include your VS Code version, operating system, reproduction steps, expected behavior, and actual behavior.

## Documentation

Detailed requirements and implementation plans are maintained under `docs/`.

- `docs/design/requirements.md`
- `docs/design/architecture.md`
- `docs/release/qa-release-plan.md`
- `docs/release/publishing-checklist.md`

## Release Status

The current version is `0.1.0` and is in early development. Before each Marketplace release, bump the version in `package.json`, run `pnpm run package:vsix`, and upload the generated `.vsix` file from the Marketplace publisher management page.

## License

This project is distributed under the MIT License. See `LICENSE` for details.
