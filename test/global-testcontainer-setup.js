/**
 * Global Testcontainer Setup
 * Manages Elasticsearch container lifecycle for tests
 */
const { ElasticsearchContainer } = require('@testcontainers/elasticsearch');
const fs = require('fs');
const path = require('path');

let container = null;

// File to share container URL between global setup and test workers
const CONTAINER_URL_FILE = path.join(process.cwd(), '.testcontainer-url');

/**
 * Wait for Elasticsearch to be fully ready to accept connections
 */
async function waitForElasticsearchReady(url, maxRetries = 30, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.version && data.version.number) {
          console.log(`✅ Elasticsearch is ready (version ${data.version.number}, attempt ${attempt})`);
          return;
        }
      }
    } catch (error) {
      // Connection failed, retry
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Elasticsearch failed to become ready after ${maxRetries} attempts`);
}

/**
 * Start Elasticsearch container and expose connection details via file
 */
module.exports = async function globalSetup() {
  // Guard against multiple calls
  if (container) {
    console.log('🐳 Elasticsearch testcontainer already running, reusing existing container');
    return;
  }

  try {
    // Allow ES version to be configured via environment variable
    // Default to 9.3.0 for local development
    const esVersion = process.env.ES_VERSION || '9.3.0';
    const esImage = `docker.elastic.co/elasticsearch/elasticsearch:${esVersion}`;

    console.log(`🐳 Starting Elasticsearch testcontainer (version: ${esVersion})...`);

    // Start Elasticsearch container
    container = await new ElasticsearchContainer(esImage)
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
      })
      .withExposedPorts(9200)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(9200);
    const url = `http://${host}:${port}`;

    // Wait for Elasticsearch to be fully ready
    console.log(`[Testcontainer] Waiting for Elasticsearch to be ready at ${url}...`);
    await waitForElasticsearchReady(url);
    console.log(`[Testcontainer] Elasticsearch is ready!`);

    // Write connection details to file for test workers to read
    const connectionInfo = {
      url,
      host,
      port: port.toString(),
      protocol: 'http',
    };

    fs.writeFileSync(CONTAINER_URL_FILE, JSON.stringify(connectionInfo, null, 2));

    // Set environment variable for transformer to use
    process.env.ELASTICSEARCH_URL = url;

    console.log(`✅ Elasticsearch testcontainer started: ${url}`);
    console.log(`   Container ID: ${container.getId()}`);
    console.log(`   Connection info written to: ${CONTAINER_URL_FILE}`);
    console.log(`   ELASTICSEARCH_URL environment variable set`);

    // Store container reference globally for teardown
    global.__TESTCONTAINER__ = container;
  } catch (error) {
    console.error('❌ Failed to start Elasticsearch testcontainer:', error);
    throw error;
  }
};
