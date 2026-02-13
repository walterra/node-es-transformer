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
- **Entry point**: `src/main.js`
- **Core modules**:
  - `_file-reader.js` - Streaming file ingestion
  - `_index-reader.js` - Reading from Elasticsearch indices
  - `_stream-reader.js` - Stream-based ingestion
  - `_index-queue.js` - Buffered bulk indexing
  - `_create-mapping.js` - Index mapping management

## Development Commands

```bash
# Install dependencies
yarn

# Build the library (creates dist/node-es-transformer.{cjs,esm}.js)
yarn build

# Watch mode for development
yarn dev

# Run tests (requires Elasticsearch at http://localhost:9200)
yarn test

# Create version and changelog
yarn release -- --release-as <version>

# Generate sample data
yarn create-sample-data-100
yarn create-sample-data-10000
```

## Testing Requirements

**Critical**: Tests require a running Elasticsearch instance without security at `http://localhost:9200`.

### Setup Test Environment with Docker

```bash
# Pull the image
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.17.0

# Run container (no security, single-node)
docker run --name es01 --net elastic -p 9200:9200 -it -m 1GB \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.17.0
```

### Running Tests

- Tests run with `--runInBand --detectOpenHandles --forceExit` flags
- Build is run automatically before tests (`pretest` script)
- Test files are in `__tests__/**/*.test.js`

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

1. **Memory Issues**: Don't set `bufferSize` too high or you'll run out of heap
2. **ES Timeouts**: For large bulk requests, you may need to tune ES timeout settings
3. **File Encoding**: Assumes UTF-8 encoding
4. **Line Splitting**: Uses `\n` by default; override with `splitRegex` if needed
5. **Mapping Conflicts**: When reindexing, ensure target mappings are compatible

## PR Guidelines

- Run `yarn lint` and `yarn test` before committing
- Use `cz` for commit messages (Commitizen)
- Tests must pass in CI (GitHub Actions workflow in `.github/workflows/ci.yml`)
- Update CHANGELOG.md using `yarn release` (commit-and-tag-version)
- Ensure both CommonJS and ESM builds work
- Add tests for new features or bug fixes

## Release Process

1. Make your changes and commit using `cz`
2. Run `yarn release -- --release-as <version>` (e.g., `1.0.0-beta8`)
3. This updates version in `package.json` and `CHANGELOG.md`
4. Push tags to trigger CI/CD

## Useful Examples

See `__tests__/**/*.test.js` for comprehensive usage examples including:
- File ingestion (JSON, CSV)
- Reindexing with transformations
- Stream-based ingestion
- Mapping management
- Wildcard file patterns
- Document splitting
- Populated fields detection

## Notes for AI Agents

- This is a **library**, not an application - focus on API design and streaming performance
- When making changes, ensure both `dist/node-es-transformer.cjs.js` and `dist/node-es-transformer.esm.js` are properly built
- Test with actual large files when possible, not just unit tests
- Memory profiling is important - use `--inspect` flag if investigating memory issues
- The package is published to npm, so breaking changes need major version bumps
