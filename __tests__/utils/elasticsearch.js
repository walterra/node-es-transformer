const elasticsearch = require('@elastic/elasticsearch');

const elasticsearchUrl = 'http://localhost:9200';

module.exports.elasticsearchUrl = elasticsearchUrl;

module.exports.getElasticsearchClient = () =>
  new elasticsearch.Client({
    node: elasticsearchUrl,
  });
