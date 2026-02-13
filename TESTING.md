# Testing Guide

This document describes the testing approach, coverage, and how to run tests.

## Testing Philosophy

Tests focus on real-world scenarios using actual Elasticsearch instances. No mocking of the ES client - tests run against real containers managed by Testcontainers.

**Why this approach:**
- Catches real integration issues
- Tests actual ES behavior across versions
- Validates cross-version compatibility
- More confidence in production usage

**Trade-offs:**
- Slower than unit tests
- Requires Docker
- First run downloads ES images

## Test Suite Overview

### Test Files

| File | Purpose | What It Tests |
|------|---------|---------------|
| `file_reader_100.test.js` | Small file ingestion | Reading 100 docs from JSON file |
| `file_reader_10000.test.js` | Medium file ingestion | Reading 10,000 docs from JSON file |
| `file_reader_wildcard.test.js` | Wildcard patterns | Multiple files with `*.json` pattern |
| `index_reader_10000.test.js` | Reindexing | Reindex 10k docs from one index to another |
| `index_reader_populated_fields.test.js` | Populated fields detection | Auto-detect which fields have data |
| `stream_reader.test.js` | Stream ingestion | Ingest from Node.js readable stream |
| `cross_version_reindex.test.js` | Cross-version reindex | ES 8.x → 9.x migration |

### Type Checking

- `test/types.test.ts` - TypeScript definitions validation (type-checked, not executed)

## Test Infrastructure

### Testcontainers

Tests use [Testcontainers](https://node.testcontainers.org/) to automatically manage Elasticsearch Docker containers.

**Setup files:**
- `test/global-testcontainer-setup.js` - Starts ES container before tests
- `test/global-testcontainer-teardown.js` - Stops ES container after tests
- `test/cross-version-setup.js` - Starts two ES containers (8.x and 9.x)
- `test/cross-version-teardown.js` - Stops both containers

**How it works:**
1. Jest starts
2. Setup script starts ES container(s)
3. Tests run against the container(s)
4. Teardown script stops and removes container(s)

**Container settings:**
- ES is configured with `xpack.security.enabled=false` for simplicity
- Exposed on dynamic port (avoids conflicts)
- Cleaned up automatically after tests

## Running Tests

### Standard Tests

Run tests against a single ES version:

```bash
yarn test                    # Default: ES 9.3.0
ES_VERSION=8.17.0 yarn test  # Test against ES 8.17.0
ES_VERSION=9.0.0 yarn test   # Test against ES 9.0.0
```

**First run:**
- Downloads ES Docker image (1-2 minutes, one-time)
- Subsequent runs reuse the image

### Cross-Version Tests

Test ES 8.x → 9.x reindexing:

```bash
yarn test:cross-version
```

This spins up two containers simultaneously:
- ES 8.17.0 (source)
- ES 9.3.0 (target)

More resource-intensive (~4GB RAM needed).

### Type Checking

Validate TypeScript definitions:

```bash
yarn test:types
```

Fast, no ES needed. Runs in CI before other tests.

### All Tests

```bash
yarn test && yarn test:cross-version && yarn test:types
```

## Test Coverage

### What's Covered

**✅ Core functionality:**
- File ingestion (JSON, small and large files)
- Reindexing from ES index
- Stream-based ingestion
- Wildcard file patterns
- Transform functions (via reindex test)
- Populated fields detection

**✅ Multi-version support:**
- ES 8.17.0, 8.19.11, 9.0.0, 9.3.0 (CI matrix)
- Cross-version reindexing (8.x → 9.x)

**✅ TypeScript:**
- Type definitions validated
- All options and types checked

**✅ Integration:**
- Real ES cluster behavior
- Bulk indexing
- Index creation with mappings

### What's Not Covered

**❌ Not tested (yet):**
- Error handling edge cases (ES timeout, network failure, etc.)
- Memory usage under extreme load
- Document splitting (transform returning array)
- All configuration options combinations
- Performance benchmarks (see [issue #29](https://github.com/walterra/node-es-transformer/issues/29))

**❌ Not tested (intentionally):**
- Internal implementation details
- Private functions
- Build process output

## Writing Tests

### Test Pattern

Tests follow this pattern:

```javascript
describe('feature name', () => {
  it('should do something', async () => {
    // Arrange: Set up data/index
    await setupTestIndex();
    
    // Act: Run transformer
    await transformer({ /* options */ });
    
    // Assert: Verify results
    const result = await verifyResults();
    expect(result).toBe(expected);
  });
});
```

### Using Test Fixtures

Sample data files are in `data/`:
- `data/sample_data_100.json` - 100 documents
- `data/sample_data_10000.json` - 10,000 documents

Generate new sample data:

```bash
yarn create-sample-data-100
yarn create-sample-data-10000
```

### Accessing ES in Tests

ES connection is available via `global.esUrl`:

```javascript
const { Client } = require('es9');

const client = new Client({ node: global.esUrl });
// Use client in tests
```

## CI Testing

Tests run automatically in GitHub Actions on:
- Push to `main`
- Pull requests

**CI matrix:**
- Single-version tests: ES 8.17.0, 8.19.11, 9.0.0, 9.3.0
- Cross-version test: ES 8.17.0 → 9.3.0
- Type checking: Always runs first

See `.github/workflows/ci.yml` for configuration.

## Debugging Tests

### Run Single Test File

```bash
yarn test __tests__/file_reader_100.test.js
```

### Enable Verbose Logging

Transformer has `verbose: true` by default in tests. To see more:

```javascript
await transformer({
  // ...
  verbose: true  // Shows progress bars and logs
});
```

### Check ES Container Logs

If using manually started ES instead of testcontainers:

```bash
docker logs <container-id>
```

### Manual ES Setup

To avoid testcontainers overhead during development:

```bash
# Start ES manually
docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:9.3.0

# Tests will use localhost:9200 if available
yarn test
```

## Test Performance

**Single-version tests:**
- Duration: ~30-60 seconds (depending on machine)
- Most time spent: Starting ES container (first run), indexing test data

**Cross-version tests:**
- Duration: ~60-90 seconds
- Most time spent: Starting two ES containers

**Type checking:**
- Duration: ~1 second
- Very fast, no ES needed

## Known Issues

### Open Handles Warning

Jest may warn about open handles after tests complete. This is a known issue ([#23](https://github.com/walterra/node-es-transformer/issues/23)) related to stream cleanup.

Tests use `--forceExit` flag to handle this. The warning is harmless and doesn't affect test results.

## Improving Test Coverage

Want to help improve tests?

**High-value additions:**
- Document splitting tests (transform returning arrays)
- Error handling scenarios
- Memory usage tests
- More transform function variations
- Edge cases (empty files, malformed JSON, etc.)

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Questions?

If tests fail or you have questions about testing:

1. Check Docker is running: `docker ps`
2. Check Node.js version: `node --version` (should be 22+)
3. Look at CI logs for comparison
4. Open an issue with test output
