/**
 * Cross-Version Test Teardown
 * Stops both ES 8.x and 9.x containers
 */
const fs = require('fs');
const path = require('path');

const CONTAINER_8_URL_FILE = path.join(process.cwd(), '.testcontainer-es8-url');
const CONTAINER_9_URL_FILE = path.join(process.cwd(), '.testcontainer-es9-url');

module.exports = async function crossVersionTeardown() {
  console.log('🧹 Cleaning up Elasticsearch testcontainers...');

  const container8 = global.__TESTCONTAINER_ES8__;
  const container9 = global.__TESTCONTAINER_ES9__;

  // Stop ES 8.x container
  if (container8) {
    try {
      console.log('Stopping Elasticsearch 8.x container...');
      await container8.stop();
      console.log('✅ Elasticsearch 8.x container stopped');
    } catch (error) {
      console.error('Failed to stop Elasticsearch 8.x container:', error);
    }
  }

  // Stop ES 9.x container
  if (container9) {
    try {
      console.log('Stopping Elasticsearch 9.x container...');
      await container9.stop();
      console.log('✅ Elasticsearch 9.x container stopped');
    } catch (error) {
      console.error('Failed to stop Elasticsearch 9.x container:', error);
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
  } catch (error) {
    console.error('Failed to clean up config files:', error);
  }

  console.log('✅ Cleanup complete');
};
