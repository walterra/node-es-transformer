/**
 * Global Testcontainer Teardown
 * Stops Elasticsearch container and cleanup connection info file
 */
const fs = require('fs');
const path = require('path');

const CONTAINER_URL_FILE = path.join(process.cwd(), '.testcontainer-url');

/**
 * Stop Elasticsearch container and cleanup connection info file
 */
module.exports = async function globalTeardown() {
  const container = global.__TESTCONTAINER__;

  if (container) {
    console.log('🛑 Stopping Elasticsearch testcontainer...');
    try {
      await container.stop();
      console.log('✅ Elasticsearch testcontainer stopped');
    } catch (error) {
      console.error('⚠️  Failed to stop Elasticsearch testcontainer:', error);
      // Don't throw - cleanup should be best-effort
    }
  }

  // Clean up connection info file
  try {
    if (fs.existsSync(CONTAINER_URL_FILE)) {
      fs.unlinkSync(CONTAINER_URL_FILE);
      console.log('✅ Cleaned up connection info file');
    }
  } catch (error) {
    console.warn('⚠️  Failed to clean up connection info file:', error);
  }
};
