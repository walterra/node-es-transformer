# Changesets

This directory contains changesets for version management.

## Important: One Changeset Per PR

**Create ONE changeset per PR/branch** that describes all changes. Do not create multiple changesets for the same PR.

## Adding a changeset (Coding Agents)

Create ONE `.md` file with a concise one-liner covering all PR changes:

```markdown
---
"node-es-transformer": patch|minor|major
---

Concise one-line description of the change(s)
```

**Examples:**
- `.changeset/fix-memory-leak.md` - Fix memory leak in stream cleanup (patch)
- `.changeset/add-gzip-support.md` - Add support for gzip-compressed files (minor)
- `.changeset/node-22-upgrade.md` - Update to Node.js 22 and add automated publishing (major)

If your PR includes multiple changes, combine them into one changeset with the highest version bump needed.

## Adding a changeset (Human Developers)

```bash
yarn changeset
```

This will prompt you to describe your changes and select the type of version bump:
- **patch**: Bug fixes, minor changes
- **minor**: New features, backwards-compatible
- **major**: Breaking changes

## How it works

1. Add changesets during development (write .md files or run `yarn changeset`)
2. On push to `main`, the release workflow creates/updates a release PR
3. When the release PR is merged, a GitHub release is automatically created

## Learn more

https://github.com/changesets/changesets
