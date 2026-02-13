# Performance Guide

This document provides performance characteristics, benchmarks, and tuning guidance for node-es-transformer.

## Performance Characteristics

### Throughput

Tested on a single machine running both node-es-transformer and Elasticsearch:

- **Hardware**: 2.9 GHz Intel Core i7, 16GB RAM, SSD
- **Throughput**: Up to **20,000 documents/second**
- **File size**: Successfully tested with 20-30 GB files
- **Formats**: JSON and CSV

Actual throughput depends on:

- Document size (smaller docs = higher throughput)
- Transform function complexity
- Elasticsearch cluster performance
- Network latency (if ES is remote)
- Available system resources

### Memory Usage

The library is designed for **constant memory usage** regardless of file size:

- **Streaming reads**: Files are read line-by-line, not loaded entirely into memory
- **Buffered writes**: Documents are queued and flushed in batches
- **No accumulation**: Processed documents are not kept in memory

Typical memory footprint:

- **Base overhead**: ~50-100 MB (Node.js runtime)
- **Buffer size**: Configurable (default 5 MB)
- **Transform overhead**: Depends on your transform function

### Bottlenecks

Common performance bottlenecks in order of impact:

1. **Elasticsearch indexing speed** - The ES cluster is usually the limiting factor
2. **Transform function complexity** - Heavy processing slows throughput
3. **Network latency** - Remote ES clusters add round-trip time
4. **Disk I/O** - Reading from slow disks (HDD vs SSD)
5. **Document parsing** - JSON parsing for complex documents

## Tuning Parameters

### bufferSize

Controls when bulk requests are sent to Elasticsearch.

```javascript
transformer({
  bufferSize: 5120, // 5 MB (default)
  // ...
});
```

**Recommendations:**

- **Small documents** (<1 KB): Increase to 10240 (10 MB) for fewer, larger bulk requests
- **Large documents** (>10 KB): Decrease to 2560 (2.5 MB) to avoid timeouts
- **Slow network**: Decrease to send smaller payloads
- **Fast local ES**: Increase to batch more aggressively

**Trade-offs:**

- Larger buffers = fewer requests, higher throughput, more memory
- Smaller buffers = more requests, lower throughput, less memory

### searchSize

Controls documents fetched per scroll request when reindexing.

```javascript
transformer({
  searchSize: 100, // Default
  // ...
});
```

**Recommendations:**

- **Small documents**: Increase to 500-1000
- **Large documents**: Decrease to 50
- **Remote source cluster**: Decrease to reduce network payload

### Parallelization

The library handles one stream at a time. For parallel ingestion:

**Option 1: Multiple processes**

```bash
# Ingest multiple files in parallel
node ingest.js file1.json &
node ingest.js file2.json &
node ingest.js file3.json &
wait
```

**Option 2: Wildcard with manual splitting**

```javascript
// Split large file sets into batches
transformer({ fileName: 'logs/batch1/*.json', ... });
transformer({ fileName: 'logs/batch2/*.json', ... });
```

## Benchmarks

Formal benchmarks are planned but not yet available. See [GitHub issue #29](https://github.com/walterra/node-es-transformer/issues/29) for progress.

The README mentions throughput of up to 20k documents/second on reference hardware (2.9 GHz Intel Core i7, 16GB RAM, SSD), but this varies significantly based on:

- Document size and complexity
- Transform function overhead
- Elasticsearch cluster performance
- Network latency
- Available system resources

## Performance Best Practices

### 1. Use Appropriate Buffer Sizes

Match buffer size to your document characteristics:

```javascript
// Small documents (< 1 KB)
transformer({
  bufferSize: 10240, // 10 MB
  searchSize: 500,
});

// Large documents (> 10 KB)
transformer({
  bufferSize: 2560, // 2.5 MB
  searchSize: 50,
});
```

### 2. Optimize Transform Functions

Keep transform functions fast and synchronous:

**Good:**

```javascript
transform(doc) {
  return {
    ...doc,
    full_name: `${doc.first_name} ${doc.last_name}`
  };
}
```

**Bad (avoid):**

```javascript
// Don't do async operations or external calls
transform(doc) {
  // ❌ Blocking or expensive operations
  const result = expensiveComputation(doc);
  return result;
}
```

### 3. Use Local Elasticsearch for Testing

Network latency significantly impacts throughput. For development/testing:

```javascript
transformer({
  targetClientConfig: {
    node: 'http://localhost:9200', // Local, no network overhead
  },
});
```

### 4. Pre-Create Indices with Mappings

If you know your mappings, create the index beforehand:

```javascript
// Let the library create the index (slower)
transformer({
  mappings: {
    /* ... */
  },
  deleteIndex: true,
});

// Or create index manually first (faster)
// Then just ingest:
transformer({
  targetIndexName: 'pre-created-index',
});
```

### 5. Disable Verbose Output for Production

Progress bars have overhead:

```javascript
transformer({
  verbose: false, // Disable for maximum throughput
});
```

### 6. Tune Elasticsearch Settings

Elasticsearch settings impact ingestion speed:

```json
{
  "index": {
    "refresh_interval": "30s", // Slower refresh = faster ingestion
    "number_of_replicas": 0, // No replicas during bulk load
    "translog.durability": "async" // Async translog for speed
  }
}
```

**Remember to reset these after ingestion!**

### 7. Monitor ES Cluster Health

Watch for bottlenecks:

```bash
# Check indexing rate
GET /_stats/indexing

# Check queue sizes
GET /_cat/thread_pool/write?v

# Monitor cluster health
GET /_cluster/health
```

## Troubleshooting Performance

### Slow Ingestion

**Problem**: Throughput is much lower than expected.

**Diagnosis:**

1. Check ES cluster stats (is ES the bottleneck?)
2. Monitor network latency (use local ES to test)
3. Profile transform function (is it expensive?)
4. Check disk I/O (is source file on slow disk?)

**Solutions:**

- Increase `bufferSize` to batch more documents
- Simplify transform function
- Move to SSD if using HDD
- Increase ES cluster resources

### Out of Memory

**Problem**: Node.js process runs out of heap memory.

**Diagnosis:**

- Check if transform function accumulates data
- Verify buffer size isn't excessive
- Look for memory leaks in custom code

**Solutions:**

- Decrease `bufferSize`
- Fix memory leaks in transform function
- Increase Node.js heap: `node --max-old-space-size=4096 script.js`

### Timeouts

**Problem**: Bulk requests time out.

**Solutions:**

- Decrease `bufferSize` (smaller payloads)
- Increase Elasticsearch timeout settings
- Check ES cluster capacity
- Reduce `searchSize` for reindexing

## Monitoring Progress

Track ingestion progress using events:

```javascript
const result = await transformer({
  /* options */
});

let indexed = 0;
result.events.on('indexed', count => {
  indexed += count;
  console.log(`Indexed: ${indexed}`);
});

result.events.on('complete', () => {
  console.log(`Total: ${indexed} documents`);
});
```
