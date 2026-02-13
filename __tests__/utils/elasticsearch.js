const { Client: Client9 } = require('es9');
const { Client: Client8 } = require('es8');
const fs = require('fs');
const path = require('path');

/**
 * Get Elasticsearch URL from testcontainer config file or fallback to localhost
 * This is called lazily to ensure the testcontainer config file exists
 */
function getElasticsearchUrl() {
  const configFile = path.join(process.cwd(), '.testcontainer-url');

  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      return config.url;
    } catch (error) {
      console.warn('Failed to read testcontainer config, falling back to localhost:', error);
    }
  }

  // Fallback for local development (when running ES manually)
  return 'http://localhost:9200';
}

/**
 * Get the appropriate Elasticsearch client based on the ES_VERSION environment variable
 */
function getElasticsearchClient() {
  const esVersion = process.env.ES_VERSION || '9.3.0';
  const majorVersion = parseInt(esVersion.split('.')[0], 10);
  
  const ClientClass = majorVersion >= 9 ? Client9 : Client8;
  
  return new ClientClass({
    node: getElasticsearchUrl(),
  });
}

// Lazy getter to ensure URL is resolved after testcontainer setup
Object.defineProperty(module.exports, 'elasticsearchUrl', {
  get() {
    return getElasticsearchUrl();
  },
});

module.exports.getElasticsearchClient = getElasticsearchClient;
