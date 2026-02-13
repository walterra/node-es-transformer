# Testing Guide

This document describes the testing infrastructure for node-es-transformer.

## Test Types

### Single-Version Tests

Tests the library against a single Elasticsearch version at a time. These tests are fast and cover the core functionality.

**Local:**
```bash
# Default (ES 9.3.0)
yarn test

# Specific version
ES_VERSION=8.17.0 yarn test
ES_VERSION=8.19.11 yarn test
ES_VERSION=9.0.0 yarn test
ES_VERSION=9.3.0 yarn test
```

**CI:** Runs in matrix against ES 8.17.0, 8.19.11, 9.0.0, 9.3.0

**Test files:**
- `__tests__/file_reader_*.test.js`
- `__tests__/index_reader_*.test.js`
- `__tests__/stream_reader.test.js`

### Cross-Version Tests

Tests reindexing between Elasticsearch 8.x and 9.x. These tests spin up TWO containers simultaneously and verify cross-major-version migration.

**Local:**
```bash
yarn test:cross-version
```

**CI:** Runs as separate job with ES 8.17.0 and 9.3.0

**Test files:**
- `__tests__/cross_version_reindex.test.js`

**Test scenarios:**
1. Auto-detection reindexing (8.x → 9.x)
2. Explicit version specification
3. Pre-instantiated clients
4. Data transformation during migration

## CI Coverage

The GitHub Actions workflow runs 5 jobs on every push/PR:

| Job Name | ES Versions | Purpose |
|----------|-------------|---------|
| `test-single-version` (8.17.0) | 8.17.0 | ES 8.x early version |
| `test-single-version` (8.19.11) | 8.19.11 | ES 8.x latest |
| `test-single-version` (9.0.0) | 9.0.0 | ES 9.x early version |
| `test-single-version` (9.3.0) | 9.3.0 | ES 9.x latest |
| `test-cross-version` | 8.17.0 + 9.3.0 | Cross-major-version migration |

All jobs run independently with `fail-fast: false`, so you can see results from all versions even if one fails.

## Resource Requirements

| Test Type | Containers | RAM Required | Duration |
|-----------|------------|--------------|----------|
| Single-version | 1 | ~2GB | ~30-60s |
| Cross-version | 2 | ~4GB | ~90-120s |

## Test Infrastructure

### Setup Files

- **Single-version:**
  - Setup: `test/global-testcontainer-setup.js`
  - Teardown: `test/global-testcontainer-teardown.js`
  - Config file: `.testcontainer-url`

- **Cross-version:**
  - Setup: `test/cross-version-setup.js`
  - Teardown: `test/cross-version-teardown.js`
  - Config files: `.testcontainer-es8-url`, `.testcontainer-es9-url`

### Jest Configuration

```json
{
  "test": "jest --runInBand --detectOpenHandles --forceExit --testPathIgnorePatterns=cross_version_reindex",
  "test:cross-version": "jest --runInBand --detectOpenHandles --forceExit --testMatch='**/__tests__/cross_version_reindex.test.js' --globalSetup='<rootDir>/test/cross-version-setup.js' --globalTeardown='<rootDir>/test/cross-version-teardown.js'"
}
```

Key flags:
- `--runInBand`: Run tests serially (required for container management)
- `--detectOpenHandles`: Detect open handles (helps debug cleanup issues)
- `--forceExit`: Force exit after tests (known issue with stream cleanup)
- `--testPathIgnorePatterns`: Exclude cross-version tests from standard run

## Troubleshooting

### Tests fail with "Cannot connect to Docker daemon"
**Solution:** Ensure Docker is running: `docker ps`

### Tests fail with "Port already in use"
**Solution:** Stop any local Elasticsearch instances or clean up stale containers:
```bash
docker ps -a | grep elasticsearch
docker stop <container-id>
```

### Cross-version tests timeout
**Solution:** Increase available memory to Docker (need ~4GB minimum)

### Container download takes too long
**Info:** First run downloads ES images (~1-2 minutes each). Subsequent runs reuse cached images.

### Open handles warning
**Info:** Known issue (#23). Tests use `--forceExit` to handle stream cleanup. Not a real problem.

## Adding New Tests

### Single-Version Test
Create `__tests__/my_feature.test.js`:
```javascript
const transformer = require('../dist/node-es-transformer.cjs');
const { getElasticsearchClient } = require('./utils/elasticsearch');

describe('My feature', () => {
  test('should do something', async () => {
    const client = getElasticsearchClient();
    // Test uses whatever ES version is set via ES_VERSION
    // ...
  });
});
```

### Cross-Version Test
Add to `__tests__/cross_version_reindex.test.js`:
```javascript
test('should handle my scenario', async () => {
  const { url8, url9 } = getElasticsearchUrls();
  // Setup data in ES 8.x at url8
  // Reindex to ES 9.x at url9
  // Verify results
});
```

## Best Practices

1. **Always clean up:** Delete test indices after each test
2. **Use unique index names:** Include timestamp or random suffix
3. **Set appropriate timeouts:** Cross-version tests need `120000` ms
4. **Verify versions:** Log ES versions in test output for debugging
5. **Test data integrity:** Verify document counts and content after reindexing
