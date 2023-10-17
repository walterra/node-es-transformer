const frisby = require('frisby');

// Define the Elasticsearch server URL
const elasticsearchBaseUrl = 'http://localhost:9200'; // Replace with your Elasticsearch server URL

// Example data to index
const documentData = {
  title: 'Sample Document',
  content: 'This is the content of a sample document.',
};

// Define an Elasticsearch index name
const indexName = 'myindex'; // Replace with your index name

// Test to create and index a document
frisby
  .create('Index a document')
  .post(`${elasticsearchBaseUrl}/${indexName}/_doc/1`, documentData, { json: true })
  .expect('status', 201)
  .expect('json', {
    result: 'created',
    _index: indexName,
    _id: '1',
  })
  .toss();

// Test to search for a document
frisby
  .create('Search for a document')
  .get(`${elasticsearchBaseUrl}/${indexName}/_search?q=content:sample`)
  .expect('status', 200)
  .expect('json', {
    hits: {
      total: {
        value: 1,
      },
    },
  })
  .toss();

// Test to delete the indexed document
frisby
  .create('Delete a document')
  .delete(`${elasticsearchBaseUrl}/${indexName}/_doc/1`)
  .expect('status', 200)
  .expect('json', {
    result: 'deleted',
    _index: indexName,
    _id: '1',
  })
  .toss();
