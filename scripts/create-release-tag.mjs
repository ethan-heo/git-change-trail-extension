import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const tag = `v${version}`;
const args = new Set(process.argv.slice(2));

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(value);
}

function tagExists(tag) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function requireCleanWorktree() {
  const status = git(['status', '--short']);
  if (status) {
    fail('Release tags should be created from a clean worktree. Commit or stash changes first.');
  }
}

function printHelp() {
  console.log(`Usage: pnpm run release:tag [-- --push]

Creates an annotated Git tag for the current package.json version.

Options:
  --push    Push the created tag to origin.
  --help    Show this help message.
`);
}

if (args.has('--help')) {
  printHelp();
  process.exit(0);
}

if (!isSemver(version)) {
  fail(`package.json version "${version}" is not a valid semver version.`);
}

requireCleanWorktree();

if (tagExists(tag)) {
  fail(`Tag ${tag} already exists.`);
}

git(['tag', '-a', tag, '-m', `Release ${tag}`]);
console.log(`Created release tag ${tag}.`);

if (args.has('--push')) {
  git(['push', 'origin', tag]);
  console.log(`Pushed release tag ${tag} to origin.`);
}
