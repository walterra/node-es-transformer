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
- **Node.js**: v22+ (see `.nvmrc`)
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
2. Build system: Rollup with Babel (requires Node.js v22+)
3. Test runner: Jest with testcontainers
4. Run `yarn build` first to ensure build works

## Testing Requirements

Tests use [Testcontainers](https://node.testcontainers.org/) to automatically manage an Elasticsearch container. No manual Docker setup required.

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
- Node.js 22+
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
7. **Node.js Version**: Requires v22+ (see `.nvmrc`)
8. **Open Handles Warning**: Pre-existing Jest warning about stream cleanup (see issue #23). Tests use `--forceExit` to handle this

## PR Guidelines

- Run `yarn lint` and `yarn test` before committing
- Use `cz` for commit messages (Commitizen)
- Write changeset file directly in `.changeset/your-change.md` with concise one-liner
- Tests must pass in CI (GitHub Actions workflows in `.github/workflows/`)
- Ensure both CommonJS and ESM builds work
- Add tests for new features or bug fixes

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and releases.

### Adding a Changeset (for Coding Agents)

**Coding agents should write changeset files directly** (avoid interactive commands):

1. Create a new `.md` file in `.changeset/` with a descriptive kebab-case name
2. Write a concise one-liner describing the change

**Format:**
```markdown
---
"node-es-transformer": patch|minor|major
---

Concise one-line description of the change
```

**Examples:**

**Patch (bug fix):**
```markdown
---
"node-es-transformer": patch
---

Fix memory leak in stream cleanup
```

**Minor (new feature):**
```markdown
---
"node-es-transformer": minor
---

Add support for gzip-compressed files
```

**Major (breaking change):**
```markdown
---
"node-es-transformer": major
---

Remove deprecated bufferLimit option (use bufferSize instead)
```

### Adding a Changeset (for Human Developers)

Interactive command (not suitable for agents):

```bash
yarn changeset
```

### Release Workflow

1. **During Development:**
   - Make changes and commit using `cz` (Commitizen)
   - Agents: Write changeset file directly in `.changeset/`
   - Humans: Run `yarn changeset` interactively
   - Commit the changeset file with your changes

2. **Automated Release PR:**
   - When changesets are pushed to `main`, the release workflow automatically creates/updates a release PR
   - The PR includes version bumps and updated CHANGELOG.md

3. **Creating a Release:**
   - Review and merge the release PR
   - Automatically triggers:
     - GitHub release created with version tag and changelog
     - Publish workflow runs automatically and publishes to npm

### npm Publishing

**Automatic:** When a GitHub release is published, the publish workflow automatically runs and publishes to npm.

**Manual:** Use the publish workflow for testing or manual releases:

```bash
# Test packaging locally
yarn pack:dry-run

# Build actual tarball
yarn pack
```

**GitHub Actions:**
- `.github/workflows/release.yml` - Creates release PR and GitHub release (no publishing)
- `.github/workflows/publish.yml` - Publishes to npm (triggered by release OR manual workflow dispatch)

**Requirements:**
- `NPM_TOKEN` secret must be set in GitHub repository settings
- Token should have publish permissions for the package

### Version Bump Guidelines

- **patch** (0.0.x): Bug fixes, documentation updates, internal refactors
- **minor** (0.x.0): New features, non-breaking API additions
- **major** (x.0.0): Breaking changes, API removals

### Checking Status

```bash
# View pending changesets
yarn changeset:status

# Preview what will be released
find .changeset -name "*.md" ! -name "README.md"

# Test package locally
yarn pack:dry-run
```

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
node --version  # Should be v22+
```

**Document findings in your work log:**
- Package manager: yarn
- Build system: Rollup + Babel
- Test runner: Jest + Testcontainers
- Node.js: v22+

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
