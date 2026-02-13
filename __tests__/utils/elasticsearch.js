const elasticsearch = require('@elastic/elasticsearch');
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

// Lazy getter to ensure URL is resolved after testcontainer setup
Object.defineProperty(module.exports, 'elasticsearchUrl', {
  get() {
    return getElasticsearchUrl();
  },
});

module.exports.getElasticsearchClient = () =>
  new elasticsearch.Client({
    node: getElasticsearchUrl(),
  });
