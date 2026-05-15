import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const changelogPath = 'CHANGELOG.md';
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function latestPreviousVersionTag() {
  const tags = git(['tag', '--list', '--sort=-creatordate']);
  if (!tags) {
    return '';
  }

  const currentTags = new Set([version, `v${version}`]);
  return tags
    .split('\n')
    .map((tag) => tag.trim())
    .find((tag) => /^v?\d+\.\d+\.\d+/.test(tag) && !currentTags.has(tag)) ?? '';
}

function commitsSinceLatestTag() {
  const previousTag = latestPreviousVersionTag();
  const range = previousTag ? [`${previousTag}..HEAD`] : ['HEAD'];
  const output = git(['log', '--pretty=format:%s%x09%h', ...range]);

  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((line) => {
      const [subject, hash] = line.split('\t');
      return { subject: subject.trim(), hash: hash.trim() };
    })
    .filter(({ subject }) => subject)
    .filter(({ subject }) => !/^merge\b/i.test(subject))
    .filter(({ subject }) => !/^initial commit$/i.test(subject))
    .filter(({ subject }) => !/^bump version\b/i.test(subject))
    .filter(({ subject }) => !/^release\b/i.test(subject));
}

function normalizeBullet(subject, hash) {
  const withoutConventionalPrefix = subject.replace(
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([^)]+\))?!?:\s*/i,
    ''
  );
  const text = withoutConventionalPrefix.endsWith('.')
    ? withoutConventionalPrefix
    : `${withoutConventionalPrefix}.`;
  return `- ${text} (${hash})`;
}

function sectionFor(version, commits) {
  const buckets = {
    Added: [],
    Changed: [],
    Fixed: [],
    Removed: []
  };

  for (const commit of commits) {
    const lower = commit.subject.toLowerCase();
    const bullet = normalizeBullet(commit.subject, commit.hash);

    if (/^(feat|add)\b/.test(lower)) {
      buckets.Added.push(bullet);
    } else if (/^(fix|repair)\b/.test(lower)) {
      buckets.Fixed.push(bullet);
    } else if (/^(remove|delete)\b/.test(lower)) {
      buckets.Removed.push(bullet);
    } else {
      buckets.Changed.push(bullet);
    }
  }

  const lines = [`## [${version}] - ${today()}`, ''];

  for (const [heading, bullets] of Object.entries(buckets)) {
    if (bullets.length === 0) {
      continue;
    }

    lines.push(`### ${heading}`, '', ...bullets, '');
  }

  if (lines.length === 2) {
    lines.push('### Changed', '', '- Package release metadata only.', '');
  }

  return lines.join('\n').trimEnd();
}

function upsertVersionSection(changelog, releaseSection) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}] - `));

  if (start !== -1) {
    const next = lines.findIndex((line, index) => index > start && line.startsWith('## ['));
    const end = next === -1 ? lines.length : next;
    return [
      ...lines.slice(0, start),
      releaseSection,
      '',
      ...lines.slice(end)
    ].join('\n').trimEnd() + '\n';
  }

  const firstVersion = lines.findIndex((line) => line.startsWith('## ['));
  const insertAt = firstVersion === -1 ? lines.length : firstVersion;

  return [
    ...lines.slice(0, insertAt),
    releaseSection,
    '',
    ...lines.slice(insertAt)
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

const changelog = readFileSync(changelogPath, 'utf8');
const releaseSection = sectionFor(version, commitsSinceLatestTag());
const updatedChangelog = upsertVersionSection(changelog, releaseSection);

writeFileSync(changelogPath, updatedChangelog);
console.log(`Updated ${changelogPath} for version ${version}.`);
