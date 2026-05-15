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
- [ ] Bump `package.json` version before each `main` push that should publish a new Marketplace release.
- [ ] Build a VSIX with `pnpm run package:vsix`; this updates `CHANGELOG.md` for the current package version before packaging.
- [ ] Review the generated `CHANGELOG.md` entry and adjust wording if needed.
- [ ] Upload the generated `.vsix` file from the Marketplace publisher management page.
- [ ] Create a semver release tag with `pnpm run release:tag`; future changelog generation uses release tags to find the next commit range.
- [ ] Push the release tag with `git push origin v0.1.2`, or create and push it together with `pnpm run release:tag -- --push`.

## Post-publish smoke test

- [ ] Install the published extension in a clean VS Code window.
- [ ] Open a Git repository and confirm the Git Author Explorer view appears.
- [ ] Search one author by name and one author by email.
- [ ] Confirm changed files open from the tree view.
- [ ] Confirm dependency files appear for a selected changed file.
