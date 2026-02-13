# Migration Guide

This guide helps you upgrade from beta versions to v1.0.0 stable.

## Upgrading to v1.0.0

### Node.js Version Requirement

**v1.0.0 requires Node.js 22 or higher.**

If you're on an older version:

```bash
# Check your Node.js version
node --version

# Upgrade using nvm (recommended)
nvm install 22
nvm use 22
```

### Elasticsearch Version Support

v1.0.0 supports both Elasticsearch 8.x and 9.x simultaneously through automatic version detection.

**No code changes needed** - the library auto-detects your ES version and uses the appropriate client. This enables seamless cross-version reindexing (e.g., ES 8.x → 9.x).

**New options** (optional):
- `sourceClientVersion`: Force ES client version (8 or 9)
- `targetClientVersion`: Force ES client version (8 or 9)

```javascript
// Auto-detection (recommended)
transformer({
  sourceClientConfig: { node: 'https://es8.example.com:9200' },
  targetClientConfig: { node: 'https://es9.example.com:9200' },
  sourceIndexName: 'my-index',
  targetIndexName: 'my-index'
});

// Manual version selection (if auto-detection fails)
transformer({
  sourceClientConfig: { node: 'https://es8.example.com:9200' },
  targetClientConfig: { node: 'https://es9.example.com:9200' },
  sourceClientVersion: 8,
  targetClientVersion: 9,
  sourceIndexName: 'my-index',
  targetIndexName: 'my-index'
});
```

### Breaking Changes

#### 1. bufferSize Unit Change (beta3+)

`bufferSize` changed from **number of documents** to **kilobytes**.

**Before (beta2 and earlier):**
```javascript
transformer({
  bufferSize: 1000  // 1000 documents
});
```

**After (beta3+):**
```javascript
transformer({
  bufferSize: 5120  // 5120 KB (5 MB)
});
```

**Migration:** If you previously used a custom `bufferSize`, multiply by your average document size in KB.

#### 2. Client Configuration (alpha9+)

Client configuration changed from individual parameters to complete client config objects.

**Before (alpha8 and earlier):**
```javascript
transformer({
  sourceNode: 'http://localhost:9200',
  targetNode: 'http://localhost:9200'
});
```

**After (alpha9+):**
```javascript
transformer({
  sourceClientConfig: {
    node: 'http://localhost:9200'
  },
  targetClientConfig: {
    node: 'http://localhost:9200'
  }
});
```

**Or use pre-instantiated clients:**
```javascript
const { Client } = require('es9');

const client = new Client({
  node: 'http://localhost:9200',
  auth: { apiKey: process.env.ES_API_KEY }
});

transformer({
  sourceClient: client,
  targetClient: client
});
```

### New Features in v1.0.0

#### TypeScript Support

Full TypeScript definitions are now included:

```typescript
import transformer, { TransformerOptions } from 'node-es-transformer';

const options: TransformerOptions = {
  fileName: 'data.json',
  targetIndexName: 'my-index'
};
```

#### Stream Support

Ingest from Node.js streams:

```javascript
const { Readable } = require('stream');

transformer({
  stream: Readable.from(['{"test": true}']),
  targetIndexName: 'my-index'
});
```

#### Pipeline Support

Use Elasticsearch ingest pipelines:

```javascript
transformer({
  sourceIndexName: 'source',
  targetIndexName: 'target',
  pipeline: 'my-pipeline'
});
```

#### Populated Fields Detection

Optimize reindexing by detecting which fields are actually used:

```javascript
transformer({
  sourceIndexName: 'source',
  targetIndexName: 'target',
  populatedFields: true  // Only map fields that have data
});
```

#### Delete Index Option

Automatically delete and recreate the target index:

```javascript
transformer({
  fileName: 'data.json',
  targetIndexName: 'my-index',
  deleteIndex: true  // Delete if exists before ingesting
});
```

### Removed Features

#### Elasticsearch 6.x Support (alpha8+)

Support for `_type` from Elasticsearch 6.x indices was removed. If you're still on ES 6.x, use an older version of this library or upgrade your cluster.

### Version Compatibility Table

| node-es-transformer | Elasticsearch Client | Elasticsearch Server | Node.js |
|---------------------|---------------------|---------------------|---------|
| 1.0.0               | 8.x and 9.x         | 8.x and 9.x         | 22+     |
| 1.0.0-beta7         | 9.x only            | 9.x only            | 22+     |
| 1.0.0-beta5 - beta6 | 8.x                 | 8.x                 | 20+     |
| 1.0.0-beta4         | 8.x                 | 8.x                 | 18+     |
| < 1.0.0-beta4       | 8.x                 | 8.x                 | 18+     |

### Upgrade Checklist

Before upgrading to v1.0.0:

- [ ] Upgrade to Node.js 22+ (`node --version`)
- [ ] Review `bufferSize` if you set it (now in KB, not doc count)
- [ ] Update client config from individual params to config objects (if on alpha8 or earlier)
- [ ] Test with your data on a non-production index first
- [ ] Review new features (TypeScript, streams, pipelines, etc.)

### Getting Help

If you encounter issues during migration:

1. Check the [README](README.md) for current API documentation
2. Review [examples/](examples/) for working code samples
3. Open an issue on GitHub with:
   - Your current version
   - Target version (1.0.0)
   - Error message or unexpected behavior
   - Sample code (without credentials)

## Staying Up to Date

Subscribe to releases on GitHub to get notified of new versions:
https://github.com/walterra/node-es-transformer/releases
