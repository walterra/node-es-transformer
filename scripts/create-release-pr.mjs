#!/usr/bin/env node
/**
 * Creates or updates a release PR with version in title.
 * Replaces changesets/action for full control over PR title.
 *
 * Environment variables:
 * - GITHUB_TOKEN: Required for GitHub API calls
 * - GITHUB_REPOSITORY: owner/repo format (set by GitHub Actions)
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import logger from './_logger.mjs';

const ROOT_CHANGELOG = 'CHANGELOG.md';
const CHANGESETS_DIR = '.changeset';
const BASE_BRANCH = 'main';
const RELEASE_BRANCH = `changeset-release/${BASE_BRANCH}`;

/**
 * Executes a command and returns stdout
 * @param {string} cmd - Command to execute
 * @param {object} options - execSync options
 * @returns {string} stdout output
 */
function exec(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf-8', ...options }).trim();
}

/**
 * Executes a command with inherited stdio
 * @param {string} cmd - Command to execute
 */
function execInherit(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

/**
 * Checks if there are pending changesets
 * @returns {boolean} True if changesets exist
 */
function hasPendingChangesets() {
  if (!existsSync(CHANGESETS_DIR)) return false;
  const files = readdirSync(CHANGESETS_DIR);
  return files.some(f => f.endsWith('.md') && f !== 'README.md');
}

/**
 * Gets pending changeset count
 * @returns {number} Number of pending changesets
 */
function getChangesetCount() {
  if (!existsSync(CHANGESETS_DIR)) return 0;
  const files = readdirSync(CHANGESETS_DIR);
  return files.filter(f => f.endsWith('.md') && f !== 'README.md').length;
}

/**
 * Gets version from package.json
 * @returns {string} Current version
 */
function getVersion() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  return pkg.version;
}

/**
 * Extracts latest version entry from CHANGELOG.md
 * @param {string} version - Version to extract
 * @returns {string|null} Changelog content for version
 */
function extractChangelog(version) {
  if (!existsSync(ROOT_CHANGELOG)) return null;

  const changelog = readFileSync(ROOT_CHANGELOG, 'utf-8');
  const lines = changelog.split('\n');
  const versionHeader = `## ${version}`;
  const startIdx = lines.findIndex(line => line.startsWith(versionHeader));

  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.startsWith('## ') ||
      line.startsWith('---') ||
      line.startsWith('# ') ||
      line.startsWith('All notable changes')
    ) {
      endIdx = i;
      break;
    }
  }

  return lines
    .slice(startIdx + 1, endIdx)
    .join('\n')
    .trim();
}

/**
 * Generates PR body
 * @param {string} version - Release version
 * @param {string} changelog - Changelog content
 * @returns {string} PR body markdown
 */
function generatePrBody(version, changelog) {
  const header = `This PR was opened by the release workflow. When you're ready to do a release, merge this PR.

If you're not ready yet, any new changesets added to \`${BASE_BRANCH}\` will update this PR.

`;

  const releases = `# Releases

## node-es-transformer@${version}

${changelog || 'No changelog entries found.'}
`;

  return header + releases;
}

/**
 * Creates or updates the release PR
 * @param {string} title - PR title
 * @param {string} body - PR body
 * @returns {number} PR number
 */
function createOrUpdatePr(title, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    throw new Error('GITHUB_REPOSITORY environment variable not set');
  }

  // Write body to temp file to avoid escaping issues
  const bodyFile = join(tmpdir(), 'pr-body.md');
  writeFileSync(bodyFile, body);

  // Check for existing PR
  const existingPr = exec(
    `gh pr list --repo ${repo} --head ${RELEASE_BRANCH} --base ${BASE_BRANCH} --json number --jq '.[0].number' 2>/dev/null || echo ''`,
  );

  if (existingPr) {
    logger.info({ existingPr }, 'Updating existing release PR');
    execInherit(
      `gh pr edit ${existingPr} --repo ${repo} --title "${title}" --body-file "${bodyFile}"`,
    );
    return parseInt(existingPr, 10);
  }

  logger.info('Creating release PR');
  const prUrl = exec(
    `gh pr create --repo ${repo} --head ${RELEASE_BRANCH} --base ${BASE_BRANCH} --title "${title}" --body-file "${bodyFile}"`,
  );
  const prNumber = prUrl.split('/').pop();
  logger.info({ prNumber, prUrl }, 'Created release PR');
  return parseInt(prNumber, 10);
}

/** Configure git user for commits */
function setupGitUser() {
  exec('git config user.name "github-actions[bot]"');
  exec('git config user.email "github-actions[bot]@users.noreply.github.com"');
}

/** Prepare or reset release branch */
function prepareReleaseBranch() {
  logger.info({ releaseBranch: RELEASE_BRANCH }, 'Preparing release branch');
  try {
    exec(`git fetch origin ${RELEASE_BRANCH}:${RELEASE_BRANCH} 2>/dev/null || true`);
    exec(`git checkout ${RELEASE_BRANCH} 2>/dev/null || git checkout -b ${RELEASE_BRANCH}`);
    exec(`git fetch origin ${BASE_BRANCH}`);
    exec(`git reset --hard origin/${BASE_BRANCH}`);
  } catch {
    exec(`git checkout -b ${RELEASE_BRANCH}`);
  }
}

/** Commit and push changes, returns false if no changes */
function commitAndPush() {
  const status = exec('git status --porcelain');
  if (!status) {
    logger.info('No changes to commit');
    return false;
  }
  logger.info('Committing release changes');
  execInherit('git add .');
  exec('git commit -m "chore: version packages"');
  logger.info({ releaseBranch: RELEASE_BRANCH }, 'Pushing release branch');
  execInherit(`git push origin ${RELEASE_BRANCH} --force`);
  return true;
}

/** Main entry point */
async function main() {
  logger.info('Release PR creation started');

  if (!hasPendingChangesets()) {
    logger.info('No pending changesets found. Nothing to do.');
    return;
  }

  logger.info({ changesetCount: getChangesetCount() }, 'Pending changesets found');

  setupGitUser();
  prepareReleaseBranch();

  logger.info('Running changeset version');
  execInherit('yarn changeset version');

  const version = getVersion();
  logger.info({ version }, 'Computed release version');

  if (!commitAndPush()) return;

  const prNumber = createOrUpdatePr(
    `release v${version}`,
    generatePrBody(version, extractChangelog(version)),
  );
  logger.info({ prNumber }, 'Release PR ready for review');
}

main().catch(err => {
  logger.error({ err }, 'Release PR script failed');
  process.exit(1);
});
