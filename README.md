# Git Author Explorer

[한국어](README.ko.md)

## Introduction

Git Author Explorer is a VS Code extension for exploring files changed by Git authors within a date range. It helps you select one or more authors, review the files they changed, and inspect related dependency files from the VS Code side bar.

Main capabilities:

- Search Git authors by name or email.
- Filter changed files by author and date range.
- Browse changed files and related dependency files from side bar tree views.
- Open selected files directly in the VS Code editor.
- Use English or Korean localization.

## Development Environment

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

Useful commands:

```bash
pnpm run compile
pnpm run watch
pnpm run lint
pnpm run check
pnpm run package:vsix
```

## Contributing

Issues, bug reports, feature suggestions, and documentation improvements are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Run `pnpm run check`.
4. Open a pull request with the intent of the change and verification notes.

When reporting a bug, include your VS Code version, operating system, reproduction steps, expected behavior, and actual behavior.

## License

This project is free to use, but redistribution of the same or substantially similar software is not permitted. See `LICENSE` for details.
