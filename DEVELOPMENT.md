# Development Guide

This document covers development setup, testing, and release processes for contributors.

## Requirements

- Node.js 22+ (see `.nvmrc`)
- Docker (for running tests)
- yarn package manager

## Setup

Clone this repository and install its dependencies:

```bash
git clone https://github.com/walterra/node-es-transformer
cd node-es-transformer
yarn
```

## Build

`yarn build` builds the library to `dist`, generating two files:

- `dist/node-es-transformer.cjs.js` - A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
- `dist/node-es-transformer.esm.js` - an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json

`yarn dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

## Testing

This project uses [Testcontainers](https://node.testcontainers.org/) to run tests against real Elasticsearch instances in Docker. **No manual Docker setup is required** - containers start automatically before tests.

For detailed information about test coverage, writing tests, and debugging, see [TESTING.md](TESTING.md).

### Standard Tests (single ES version)

```bash
yarn test
```

By default, tests run against ES 9.3.0. You can test against different versions:

```bash
ES_VERSION=8.17.0 yarn test
ES_VERSION=9.0.0 yarn test
ES_VERSION=9.3.0 yarn test
```

### Cross-Version Tests (ES 8.x → 9.x reindexing)

```bash
yarn test:cross-version
```

This spins up TWO containers simultaneously (ES 8.17.0 and ES 9.3.0) and tests reindexing between major versions. This is more resource-intensive and takes longer to run.

### Requirements

- Docker daemon running (`docker ps` to verify)
- Node.js 22+
- At least 2GB available memory for single-version tests
- At least 4GB available memory for cross-version tests

The first test run will download the Elasticsearch Docker image (one-time setup). Subsequent runs reuse the image.

**Fallback:** If you prefer to run tests against a manually managed Elasticsearch instance, you can start one on `http://localhost:9200` and the tests will use it.

### Test Configuration

- Tests run with `--runInBand --detectOpenHandles --forceExit` flags
- Build is run automatically before tests (`pretest` and `pretest:cross-version` scripts)
- Standard test files: `__tests__/**/*.test.js` (excluding cross_version_reindex)
- Cross-version test file: `__tests__/cross_version_reindex.test.js`
- Standard test setup: `test/global-testcontainer-setup.js`
- Standard test teardown: `test/global-testcontainer-teardown.js`
- Cross-version setup: `test/cross-version-setup.js`
- Cross-version teardown: `test/cross-version-teardown.js`

## Code Quality

### Linting

```bash
yarn lint
```

This project uses ESLint with Prettier integration. Configuration is in `.eslintrc.js` and `prettier.config.js`.

### Editor Config

The `.editorconfig` file ensures consistent formatting across different editors.

## Committing

Use Commitizen for commit messages:

```bash
cz
```

This ensures commit messages follow the conventional commit format.

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and releases.

**Quick workflow:**

1. Create changeset with your PR: `yarn changeset`
2. Merge PR to `main`
3. Automated release PR is created
4. Merge release PR
5. GitHub release is created automatically
6. Package is published to npm automatically

**For complete details, troubleshooting, and manual release procedures, see [RELEASE.md](RELEASE.md).**

### Version Bump Guidelines

- **patch** (0.0.x): Bug fixes, documentation updates, internal refactors
- **minor** (0.x.0): New features, non-breaking API additions
- **major** (x.0.0): Breaking changes, API removals

## CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- `ci.yml` - Runs tests on pull requests
- `release.yml` - Creates release PR and GitHub release (no publishing)
- `publish.yml` - Publishes to npm (triggered by release OR manual workflow dispatch)

## Sample Data

Generate sample data for testing:

```bash
yarn create-sample-data-100
yarn create-sample-data-10000
```

## Project Structure

- `src/` - Source code
  - `main.js` - Main entry point
  - `_file-reader.js` - Streaming file ingestion
  - `_index-reader.js` - Reading from Elasticsearch indices
  - `_stream-reader.js` - Stream-based ingestion
  - `_index-queue.js` - Buffered bulk indexing
  - `_create-mapping.js` - Index mapping management
- `__tests__/` - Test files
- `test/` - Test setup and utilities
- `dist/` - Built output (generated)

## Documentation

For more detailed information about the project architecture, conventions, and workflows, see [AGENTS.md](AGENTS.md).
