# Versioning and API Stability

This document describes the versioning policy and API stability expectations for node-es-transformer.

## Context

This is a single-person best-effort project. While I aim for stability and backward compatibility, the guarantees are limited by available time and resources.

## Semantic Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes to the public API
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

## v1.0.0 Stability

Reaching v1.0.0 means:

- **Core API is stable**: The main configuration options and transform function signature won't change without a major version bump
- **Tested**: Multi-version ES support (8.x, 9.x) is tested in CI
- **Documented**: API is fully documented with examples
- **Production-ready**: Used successfully with large files (20-30 GB tested)

It does NOT mean:

- **Bug-free**: Issues will exist, report them and I'll do my best to fix
- **Guaranteed support timeline**: This is best-effort, not enterprise support
- **Immediate responses**: Fixes and features happen as time allows

## What's Considered Public API

**Stable (won't break without major version):**

- Main `transformer()` function signature
- Configuration options (adding new options is okay, removing/changing is breaking)
- Transform function signature: `(doc, context?) => doc | doc[] | null`
- Events API: `'queued'`, `'indexed'`, `'complete'`, `'error'`
- Return value structure

**Unstable (may change in minor versions):**

- Internal implementation details
- Undocumented functions
- File structure in `src/`
- Build output format (as long as CommonJS/ESM work)

## Breaking Changes

Breaking changes require a major version bump:

**Examples of breaking changes:**
- Removing configuration options
- Changing option behavior in incompatible ways
- Changing transform function signature
- Removing events
- Changing Node.js version requirement

**Not breaking changes:**
- Adding new configuration options (with defaults)
- Adding new events
- Fixing bugs (even if you relied on the bug)
- Performance improvements
- Internal refactoring

## Deprecation Policy

When something needs to be removed:

1. **Deprecation warning**: Mark as deprecated in docs and add runtime warning (if feasible)
2. **Wait for next major**: Remove in next major version
3. **Update MIGRATION.md**: Document how to migrate

**Example:**
```
v1.5.0: Add deprecation warning for oldOption
v2.0.0: Remove oldOption, document migration in MIGRATION.md
```

## Version Support

**Active version**: The latest release gets bug fixes and security patches.

**Older versions**: Best-effort only. If you need something fixed, please upgrade or submit a PR.

**Long-term support (LTS)**: Not provided. This is a single-person project, not an enterprise product.

## Release Cadence

There is no fixed release schedule. Releases happen when:

- A bug is fixed
- A new feature is ready
- A security issue is addressed
- Dependency updates are needed

This could be weekly, monthly, or longer depending on activity and available time.

## Node.js and Elasticsearch Compatibility

**Node.js**: Follows the [Node.js release schedule](https://nodejs.org/en/about/releases/). When a Node.js version goes EOL, support may be dropped in a minor version (with notice in changelog).

**Elasticsearch**: Currently supports ES 8.x and 9.x. When ES 10.x is released, support will be added as time allows. Dropping support for old ES versions may happen in major versions.

## Reporting Issues

If you find a bug or breaking change:

1. Check existing issues on GitHub
2. Open a new issue with details (version, repro steps, expected vs actual)
3. Be patient - responses are best-effort

## Contributing

Want to help maintain stability?

- Report bugs early (during beta/RC phases)
- Submit PRs for fixes
- Help review PRs
- Improve documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## What This Policy Means for You

**If you need absolute stability**: Pin to a specific version in your `package.json`:

```json
{
  "dependencies": {
    "node-es-transformer": "1.0.0"
  }
}
```

**If you want bug fixes**: Use caret ranges (default):

```json
{
  "dependencies": {
    "node-es-transformer": "^1.0.0"
  }
}
```

This allows minor and patch updates but not major breaking changes.

**If you're adventurous**: Use latest:

```json
{
  "dependencies": {
    "node-es-transformer": "*"
  }
}
```

Not recommended for production.

## Questions?

Open a discussion on GitHub if you have questions about versioning or API stability.
