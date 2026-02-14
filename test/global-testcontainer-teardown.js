/**
 * Global Testcontainer Teardown
 * Stops Elasticsearch container and cleanup connection info file
 */
const fs = require('fs');
const path = require('path');

const logger = require('./_logger');

const CONTAINER_URL_FILE = path.join(process.cwd(), '.testcontainer-url');

/**
 * Stop Elasticsearch container and cleanup connection info file
 */
module.exports = async function globalTeardown() {
  const container = global.__TESTCONTAINER__;

  if (container) {
    logger.info('Stopping Elasticsearch testcontainer');
    try {
      await container.stop();
      logger.info('Elasticsearch testcontainer stopped');
    } catch (err) {
      logger.warn({ err }, 'Failed to stop Elasticsearch testcontainer');
      // Don't throw - cleanup should be best-effort
    }
  }

  // Clean up connection info file
  try {
    if (fs.existsSync(CONTAINER_URL_FILE)) {
      fs.unlinkSync(CONTAINER_URL_FILE);
      logger.info({ path: CONTAINER_URL_FILE }, 'Cleaned up connection info file');
    }
  } catch (err) {
    logger.warn({ err, path: CONTAINER_URL_FILE }, 'Failed to clean up connection info file');
  }
};
