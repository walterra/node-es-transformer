# Release Process

Complete guide for releasing new versions of node-es-transformer.

## Prerequisites

Before creating any release:

- [ ] All tests passing locally (`yarn test` and `yarn test:cross-version`)
- [ ] Type checking passes (`yarn test:types`)
- [ ] Linting passes (`yarn lint`)
- [ ] No uncommitted changes
- [ ] On `main` branch

## Release Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and releases.

### 1. Make Changes and Add Changeset

When you make changes that should be released:

```bash
# Make your changes
git checkout -b feature/my-feature

# Add a changeset
yarn changeset
```

**Changeset prompts:**
1. Select version bump type:
   - **patch** (0.0.x): Bug fixes, docs, internal refactors
   - **minor** (0.x.0): New features, non-breaking additions
   - **major** (x.0.0): Breaking changes, API removals
2. Write a concise summary (appears in CHANGELOG.md)

**One changeset per PR** - combine all changes into a single changeset.

**Commit the changeset file:**

```bash
git add .changeset/your-changeset-name.md
git commit -m "feat: add new feature"
git push
```

### 2. Merge to Main

After PR review and approval:

```bash
# PR is merged to main via GitHub
```

### 3. Automatic Release PR Creation

When changesets are pushed to `main`, the release workflow automatically:

1. Runs `@changesets/action` to detect changesets
2. Creates/updates a release PR titled "Release"
3. The PR includes:
   - Version bump in `package.json`
   - Updated `CHANGELOG.md` with changeset summaries
   - Consumes (removes) the changeset files

**What the release PR looks like:**

```
Title: Release

Changes:
- Bump version from 1.0.0-beta7 to 1.0.0
- Update CHANGELOG.md with release notes
- Remove consumed changeset files
```

### 4. Review and Merge Release PR

Before merging the release PR, verify:

- [ ] Version number is correct
- [ ] CHANGELOG.md entries are accurate
- [ ] All CI checks pass (tests, typecheck, lint)
- [ ] No unintended changes in the diff

**Merge the release PR** - this triggers the next step.

### 5. Automatic GitHub Release Creation

After the release PR merges to `main`, the release workflow:

1. Detects that no changesets remain
2. Checks if a git tag exists for the current version
3. If not, creates:
   - Git tag (e.g., `v1.0.0`)
   - GitHub release with CHANGELOG excerpt

### 6. Automatic npm Publishing

When a GitHub release is published, the publish workflow automatically:

1. Downloads the release artifact
2. Builds the package
3. Publishes to npm with provenance

**Published package includes:**
- `dist/node-es-transformer.cjs.js` - CommonJS build
- `dist/node-es-transformer.esm.js` - ESM build
- `index.d.ts` - TypeScript definitions
- `LICENSE` - Apache 2.0 license
- `README.md` - Documentation
- `package.json` - Metadata

## Manual Release (Emergency)

If the automated process fails, you can manually release:

### Build and Test Package

```bash
# Ensure clean state
git checkout main
git pull origin main
yarn install --frozen-lockfile

# Build
yarn build

# Test the build
yarn test
yarn test:cross-version
yarn test:types

# Dry-run packaging
yarn pack:dry-run
```

### Manual GitHub Release

```bash
# Create and push tag
VERSION="1.0.0"  # Update this
git tag -a "v${VERSION}" -m "Release v${VERSION}"
git push origin "v${VERSION}"

# Create GitHub release using gh CLI
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes "See CHANGELOG.md for details"
```

### Manual npm Publish

**Only do this if automatic publishing fails.**

```bash
# Build tarball
npm pack

# Test publish (dry-run)
npm publish --dry-run

# Actually publish (requires npm login or token)
npm login  # Login interactively
npm publish --access public
```

**Note:** Manual npm publishing won't use OIDC or include provenance attestation. You'll need to authenticate with npm directly.

## Validation

After release, verify:

### Check npm

```bash
# View on npm (wait 1-2 minutes for propagation)
open https://www.npmjs.com/package/node-es-transformer

# Or check via CLI
npm view node-es-transformer version
npm view node-es-transformer
```

### Check GitHub Release

```bash
# View releases
open https://github.com/walterra/node-es-transformer/releases

# Should show the new release with tag and notes
```

### Test Installation

```bash
# Create test directory
mkdir /tmp/test-npm-install
cd /tmp/test-npm-install
npm init -y

# Install latest version
npm install node-es-transformer

# Verify version
node -e "console.log(require('node-es-transformer'))"

# Check TypeScript definitions exist
ls node_modules/node-es-transformer/index.d.ts
```

## Troubleshooting

### Release PR Not Created

**Problem:** Changesets pushed to `main` but no release PR appears.

**Solutions:**
1. Check `.github/workflows/release.yml` ran successfully
2. Verify changesets exist: `find .changeset -name "*.md" ! -name "README.md"`
3. Check GitHub Actions logs for errors
4. Manually trigger: Re-push to `main` or use workflow dispatch

### GitHub Release Not Created

**Problem:** Release PR merged but no GitHub release created.

**Solutions:**
1. Check release workflow completed after merge
2. Verify git tag doesn't already exist: `git tag -l`
3. Check GitHub Actions logs
4. Create manually (see Manual Release above)

### npm Publish Failed

**Problem:** GitHub release created but npm package not published.

**Solutions:**
1. Check `.github/workflows/publish.yml` logs for OIDC errors
2. Verify workflow has `id-token: write` permission
3. Check npm OIDC configuration for the package
4. Check npm status: https://status.npmjs.org/
5. Manually publish (see Manual Release above)

### Wrong Version Number

**Problem:** Released with wrong version.

**Solutions:**

**If not yet published to npm:**
1. Delete the GitHub release
2. Delete the git tag: `git push origin :refs/tags/vX.X.X`
3. Create new changeset with correct version
4. Start over

**If already published to npm:**
- npm doesn't allow unpublishing within 72 hours if downloads exist
- Publish a new patch version with fix
- Document the issue in CHANGELOG.md

### Changeset Not Consumed

**Problem:** Changeset files remain after release.

**Solutions:**
1. Check if release PR actually merged
2. Verify `@changesets/action` ran in release workflow
3. Manually remove: `git rm .changeset/*.md` and commit

## Version Numbering

Follow [Semantic Versioning 2.0.0](https://semver.org/):

### Major (x.0.0)

Breaking changes that require user action:
- Removing configuration options
- Changing function signatures
- Dropping Node.js/ES version support
- Incompatible API changes

### Minor (0.x.0)

Backward-compatible additions:
- New configuration options (with defaults)
- New features
- New events
- Performance improvements

### Patch (0.0.x)

Backward-compatible fixes:
- Bug fixes
- Documentation updates
- Internal refactoring
- Dependency updates (non-breaking)

## Release Checklist

Before releasing v1.0.0 or any major version:

- [ ] All planned features implemented
- [ ] Documentation complete and accurate
- [ ] All tests passing across all supported versions
- [ ] MIGRATION.md updated (if breaking changes)
- [ ] README.md reviewed and updated
- [ ] TypeScript definitions validated
- [ ] Example code tested
- [ ] Security audit passed: `yarn audit`
- [ ] Performance tested (if relevant)
- [ ] Announcement prepared (if major release)

## Post-Release

After a successful release:

1. **Announce** (for major/minor releases):
   - GitHub Discussions
   - Twitter/social media (optional)
   - Update any external documentation

2. **Monitor**:
   - Check npm download stats
   - Watch for issues on GitHub
   - Monitor npm package page

3. **Update Documentation** (if needed):
   - Update links pointing to version numbers
   - Refresh screenshots (if any)
   - Update version tables

## GitHub Configuration

### OIDC Authentication

This project uses **OpenID Connect (OIDC)** for npm publishing instead of long-lived tokens. The publish workflow has `id-token: write` permissions which allows GitHub Actions to authenticate to npm without storing credentials.

**No secrets needed** - npm authentication happens automatically via OIDC when the workflow runs.

**Requirements:**
- npm package must be configured to trust GitHub Actions OIDC
- Workflow must have `permissions.id-token: write`
- Use `npm publish --provenance` flag (already configured)

**GitHub Tokens:**

| Token | Purpose | Setup |
|-------|---------|-------|
| `GITHUB_TOKEN` | GitHub API access | Automatically provided by GitHub Actions |
| npm auth | Publish to npm | Uses OIDC (no token needed) |

## Release Frequency

There's no fixed release schedule. Releases happen when:
- Bug fixes are ready
- New features are complete
- Security issues are addressed
- Dependency updates are needed

This could be weekly, monthly, or longer depending on activity.

## Questions?

If you have questions about the release process:
- Check GitHub Actions workflow logs
- Review past releases for examples
- Open a discussion on GitHub
