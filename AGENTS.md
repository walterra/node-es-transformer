# node-es-transformer

A Node.js library for ingesting and transforming large data files (CSV/JSON) into Elasticsearch indices, with support for streaming, buffering, and custom transformations.

## Project Overview

This library is designed to handle very large data files (tested up to 20-30 GB) that would normally cause out-of-memory errors in Node.js. It achieves this through:
- Streaming file reads
- Buffered bulk indexing to Elasticsearch
- Support for reading from files, Elasticsearch indices, or Node.js streams
- Custom transform functions for data manipulation

**Key Features:**
- Ingestion rates up to 20k documents/second
- Wildcard support for batch file processing
- Reindex from existing Elasticsearch indices with custom transformations
- Document splitting (e.g., convert one tweet into multiple hashtag-centric documents)

## Architecture

- **Built with**: Rollup for bundling (CommonJS + ESM)
- **Node.js**: v18+ (see `.nvmrc`)
- **Entry point**: `src/main.js`
- **Core modules**:
  - `_file-reader.js` - Streaming file ingestion
  - `_index-reader.js` - Reading from Elasticsearch indices
  - `_stream-reader.js` - Stream-based ingestion
  - `_index-queue.js` - Buffered bulk indexing
  - `_create-mapping.js` - Index mapping management

## Development Commands

**Package Manager: This project uses `yarn`, not `npm`**

```bash
# Install dependencies
yarn

# Build the library (creates dist/node-es-transformer.{cjs,esm}.js)
yarn build

# Watch mode for development
yarn dev

# Run tests (automatic Elasticsearch container via testcontainers)
yarn test

# Create version and changelog
yarn release -- --release-as <version>

# Generate sample data
yarn create-sample-data-100
yarn create-sample-data-10000
```

**Pre-Flight Checks:**
Before modifying dependencies or test setup, verify:
1. Lock file: `yarn.lock` (do NOT use npm)
2. Build system: Rollup with Babel (requires Node.js v18+)
3. Test runner: Jest with testcontainers
4. Run `yarn build` first to ensure build works

## Testing Requirements

Tests use [Testcontainers](https://node.testcontainers.org/) to automatically manage an Elasticsearch container. No manual Docker setup required.

**Note:** The project uses `resolutions` in package.json to force `undici@^6.x` for Node.js 18 compatibility (testcontainers requires undici 7.x which needs Node 20+).

### Running Tests

```bash
yarn test
```

**Test execution flow:**
1. Testcontainers starts Elasticsearch 8.17.0 in Docker
2. Tests run against the container on a dynamic port
3. Container stops and cleans up after completion
4. First run downloads the ES image (1-2 minutes, one-time)

**Requirements:**
- Docker daemon running (`docker ps` to verify)
- Node.js 16+
- At least 2GB available memory for ES container

**Fallback:** If Elasticsearch is already running on `http://localhost:9200`, tests will use it instead.

**Test Configuration:**
- Tests run with `--runInBand --detectOpenHandles --forceExit` flags
- Build is run automatically before tests (`pretest` script)
- Test files are in `__tests__/**/*.test.js`
- Global setup: `test/global-testcontainer-setup.js`
- Global teardown: `test/global-testcontainer-teardown.js`

## Code Style & Conventions

- **Linting**: ESLint with Prettier integration
- **Formatting**: Prettier (config in `prettier.config.js`)
- **Editor Config**: Uses `.editorconfig` for consistent formatting
- **Commit Messages**: Commitizen-friendly (use `cz` command for commits)

### Key Conventions

- Use CommonJS `require()` for the built library
- ESM imports for source code
- Async/await for async operations
- Callback pattern for `transform` function
- Progress bars for long-running operations (using `cli-progress`)

### Documentation & Communication Style

When writing documentation, commit messages, PR descriptions, or comments:

- **Be neutral and concise**: Direct statements, no emotional language
- **No emojis**: Use plain text only
- **No anthropomorphism**: Write instructions, not agent behaviors
  - Good: "Run tests before committing"
  - Bad: "The agent should run tests"
- **No exclamation marks**: Keep tone professional
- **Use checkboxes**: `[ ]` and `[x]` instead of emoji checkmarks
- **Factual descriptions**: Describe what happens, not how users should feel

## API Patterns

### Transform Function
The `transform` callback can return:
- A single transformed document (object)
- An array of documents (for splitting)
- `null` or `undefined` to skip the document

```javascript
transform(doc) {
  // Single document
  return { ...doc, full_name: `${doc.first_name} ${doc.last_name}` };
  
  // Multiple documents (splitting)
  return doc.hashtags.map(tag => ({ ...doc, hashtag: tag }));
  
  // Skip document
  if (shouldSkip(doc)) return null;
}
```

### Buffer Management
- Default buffer size: 5120 KB
- Bulk requests are sent when buffer threshold is reached
- Handles backpressure automatically

## Security Considerations

- **Elasticsearch Connection**: Default is `http://localhost:9200` (no auth)
- Use `sourceClientConfig`/`targetClientConfig` for authenticated connections
- Be cautious with `deleteIndex: true` option
- Large files may expose memory/performance issues if buffer sizes aren't tuned

## Dependencies to Know

- `@elastic/elasticsearch` - Official ES client (v8.17+)
- `event-stream` & `split2` - Streaming utilities
- `cli-progress` - Progress bars for ingestion
- `glob` - File pattern matching

## Common Pitfalls

1. **Using npm instead of yarn**: This project uses `yarn` and `yarn.lock`. Using `npm install` creates unwanted `package-lock.json`
2. **Memory Issues**: Don't set `bufferSize` too high or you'll run out of heap
3. **ES Timeouts**: For large bulk requests, you may need to tune ES timeout settings
4. **File Encoding**: Assumes UTF-8 encoding
5. **Line Splitting**: Uses `\n` by default; override with `splitRegex` if needed
6. **Mapping Conflicts**: When reindexing, ensure target mappings are compatible
7. **Node.js Version**: Requires v18+ (see `.nvmrc`)
8. **Open Handles Warning**: Pre-existing Jest warning about stream cleanup (see issue #23). Tests use `--forceExit` to handle this

## PR Guidelines

- Run `yarn lint` and `yarn test` before committing
- Use `cz` for commit messages (Commitizen)
- Tests must pass in CI (GitHub Actions workflow in `.github/workflows/ci.yml`)
- Update CHANGELOG.md using `yarn release` (commit-and-tag-version)
- Ensure both CommonJS and ESM builds work
- Add tests for new features or bug fixes

## Release Process

**Note:** This project uses `commit-and-tag-version`, not changesets (see issue #24 for future changeset support)

1. Make your changes and commit using `cz` (Commitizen for conventional commits)
2. Run `yarn release -- --release-as <version>` (e.g., `1.0.0-beta8`)
3. This updates version in `package.json` and auto-generates `CHANGELOG.md` from commit history
4. Push tags to trigger CI/CD

**Conventional Commit Format:**
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `BREAKING CHANGE:` - Major version bump
- `docs:`, `chore:`, `refactor:`, etc. - No version bump

## Useful Examples

See `__tests__/**/*.test.js` for comprehensive usage examples including:
- File ingestion (JSON, CSV)
- Reindexing with transformations
- Stream-based ingestion
- Mapping management
- Wildcard file patterns
- Document splitting
- Populated fields detection

## Implementation Workflow

### Before Starting Work

**Run these checks before modifying code:**

```bash
# 1. Verify package manager (should see yarn.lock only)
ls -la yarn.lock package-lock.json pnpm-lock.yaml 2>/dev/null

# 2. Verify build works
yarn build

# 3. Check test setup
grep -A 5 '"jest"' package.json

# 4. Verify Node.js version
node --version  # Should be v18+
```

**Document findings in your work log:**
- Package manager: yarn
- Build system: Rollup + Babel
- Test runner: Jest + Testcontainers
- Node.js: v18+

### Development Guidelines

- This is a **library**, not an application - focus on API design and streaming performance
- When making changes, ensure both `dist/node-es-transformer.cjs.js` and `dist/node-es-transformer.esm.js` are properly built
- Test with actual large files when possible, not just unit tests
- Memory profiling is important - use `--inspect` flag if investigating memory issues
- The package is published to npm, so breaking changes need major version bumps

### After Implementation

**Provide user guidance:**
1. How to test the changes locally
2. What changed in the workflow
3. What to watch out for
4. First-time setup notes (if any)

**Example:**
```
Changes complete. To test locally:

$ yarn test

Note: First run downloads ES Docker image (1-2 minutes)
```
