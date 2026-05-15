# VS Code Marketplace Publishing Checklist

## Local package validation

- [x] Remove `private: true` from `package.json`.
- [x] Add Marketplace keywords.
- [x] Add a PNG Marketplace icon.
- [x] Add `CHANGELOG.md`.
- [x] Keep development-only files out of the VSIX package with `.vscodeignore`.
- [x] Run `pnpm run check`.
- [x] Run `pnpm dlx @vscode/vsce package`.

## Required before public publishing

- [x] Choose a license and add `LICENSE`.
- [x] Add the matching `license` field to `package.json`.
- [x] Add a Git remote or canonical repository URL.
- [x] Add `repository`, `bugs`, and `homepage` fields to `package.json`.
- [ ] Create or verify the Marketplace publisher ID `ethanheo`.
- [ ] Create an Azure DevOps Marketplace Personal Access Token with Marketplace Manage scope.
- [ ] Add the PAT as a GitHub Actions repository secret named `VSCE_PAT`.
- [x] Add the GitHub Actions Marketplace publishing workflow.
- [ ] Bump `package.json` version before each `main` push that should publish a new Marketplace release.
- [ ] Run `pnpm dlx @vscode/vsce login ethanheo`.
- [ ] Publish with `pnpm dlx @vscode/vsce publish`.

## Post-publish smoke test

- [ ] Install the published extension in a clean VS Code window.
- [ ] Open a Git repository and confirm the Git Author Explorer view appears.
- [ ] Search one author by name and one author by email.
- [ ] Confirm changed files open from the tree view.
- [ ] Confirm dependency files appear for a selected changed file.
