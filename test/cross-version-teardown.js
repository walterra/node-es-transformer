/**
 * Cross-Version Test Teardown
 * Stops both ES 8.x and 9.x containers
 */
const fs = require('fs');
const path = require('path');

const logger = require('./_logger');

const CONTAINER_8_URL_FILE = path.join(process.cwd(), '.testcontainer-es8-url');
const CONTAINER_9_URL_FILE = path.join(process.cwd(), '.testcontainer-es9-url');

module.exports = async function crossVersionTeardown() {
  logger.info('Cleaning up Elasticsearch testcontainers');

  const container8 = global.__TESTCONTAINER_ES8__;
  const container9 = global.__TESTCONTAINER_ES9__;

  // Stop ES 8.x container
  if (container8) {
    try {
      logger.info('Stopping Elasticsearch 8.x container');
      await container8.stop();
      logger.info('Elasticsearch 8.x container stopped');
    } catch (err) {
      logger.error({ err }, 'Failed to stop Elasticsearch 8.x container');
    }
  }

  // Stop ES 9.x container
  if (container9) {
    try {
      logger.info('Stopping Elasticsearch 9.x container');
      await container9.stop();
      logger.info('Elasticsearch 9.x container stopped');
    } catch (err) {
      logger.error({ err }, 'Failed to stop Elasticsearch 9.x container');
    }
  }

  // Clean up config files
  try {
    if (fs.existsSync(CONTAINER_8_URL_FILE)) {
      fs.unlinkSync(CONTAINER_8_URL_FILE);
    }
    if (fs.existsSync(CONTAINER_9_URL_FILE)) {
      fs.unlinkSync(CONTAINER_9_URL_FILE);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to clean up config files');
  }

  logger.info('Cross-version cleanup complete');
};
