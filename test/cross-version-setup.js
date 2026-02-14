/**
 * Cross-Version Test Setup
 * Manages TWO Elasticsearch containers (8.x and 9.x) for testing cross-major-version reindexing
 */
const { ElasticsearchContainer } = require('@testcontainers/elasticsearch');
const fs = require('fs');
const path = require('path');

const logger = require('./_logger');

let container8 = null;
let container9 = null;

// Files to share container URLs between setup and tests
const CONTAINER_8_URL_FILE = path.join(process.cwd(), '.testcontainer-es8-url');
const CONTAINER_9_URL_FILE = path.join(process.cwd(), '.testcontainer-es9-url');

/**
 * Wait for Elasticsearch to be fully ready to accept connections
 */
async function waitForElasticsearchReady(url, version, maxRetries = 30, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.version && data.version.number) {
          logger.info(
            { requestedVersion: version, version: data.version.number, attempt },
            'Elasticsearch is ready for cross-version test setup',
          );
          return;
        }
      }
    } catch (err) {
      // Connection failed, retry
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Elasticsearch ${version} failed to become ready after ${maxRetries} attempts`);
}

/**
 * Start both ES 8.x and 9.x containers for cross-version testing
 */
module.exports = async function crossVersionSetup() {
  logger.info('Starting dual Elasticsearch testcontainers for cross-version testing');

  try {
    // Start ES 8.x container
    logger.info('Starting Elasticsearch 8.17.0 container');
    container8 = await new ElasticsearchContainer('docker.elastic.co/elasticsearch/elasticsearch:8.17.0')
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
      })
      .withExposedPorts(9200)
      .start();

    const host8 = container8.getHost();
    const port8 = container8.getMappedPort(9200);
    const url8 = `http://${host8}:${port8}`;

    logger.info({ url8 }, 'Waiting for Elasticsearch 8.x to be ready');
    await waitForElasticsearchReady(url8, '8.x');

    // Write ES 8.x connection details
    const connectionInfo8 = {
      url: url8,
      host: host8,
      port: port8.toString(),
      protocol: 'http',
      version: '8.17.0',
    };
    fs.writeFileSync(CONTAINER_8_URL_FILE, JSON.stringify(connectionInfo8, null, 2));

    logger.info(
      { url8, containerId: container8.getId(), configPath: CONTAINER_8_URL_FILE },
      'Elasticsearch 8.x container started',
    );

    // Start ES 9.x container
    logger.info('Starting Elasticsearch 9.3.0 container');
    container9 = await new ElasticsearchContainer('docker.elastic.co/elasticsearch/elasticsearch:9.3.0')
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
      })
      .withExposedPorts(9200)
      .start();

    const host9 = container9.getHost();
    const port9 = container9.getMappedPort(9200);
    const url9 = `http://${host9}:${port9}`;

    logger.info({ url9 }, 'Waiting for Elasticsearch 9.x to be ready');
    await waitForElasticsearchReady(url9, '9.x');

    // Write ES 9.x connection details
    const connectionInfo9 = {
      url: url9,
      host: host9,
      port: port9.toString(),
      protocol: 'http',
      version: '9.3.0',
    };
    fs.writeFileSync(CONTAINER_9_URL_FILE, JSON.stringify(connectionInfo9, null, 2));

    logger.info(
      { url9, containerId: container9.getId(), configPath: CONTAINER_9_URL_FILE },
      'Elasticsearch 9.x container started',
    );

    // Store container references globally for teardown
    global.__TESTCONTAINER_ES8__ = container8;
    global.__TESTCONTAINER_ES9__ = container9;

    logger.info('Both Elasticsearch containers ready for cross-version testing');
  } catch (err) {
    logger.error({ err }, 'Failed to start Elasticsearch testcontainers');

    // Cleanup on failure
    if (container8) {
      try {
        await container8.stop();
      } catch (cleanupErr) {
        logger.error({ err: cleanupErr }, 'Failed to stop Elasticsearch 8.x container during cleanup');
      }
    }
    if (container9) {
      try {
        await container9.stop();
      } catch (cleanupErr) {
        logger.error({ err: cleanupErr }, 'Failed to stop Elasticsearch 9.x container during cleanup');
      }
    }

    throw err;
  }
};
