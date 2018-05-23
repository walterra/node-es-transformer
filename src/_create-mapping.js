export function createMappingFactory({ client, indexName, mappings, verbose }) {
  return (callback) => {
    if (
      typeof mappings === 'object' &&
      mappings !== null
    ) {
      client.indices.create({
        index: indexName,
        body: {
          mappings
        }
      }, (err, resp) => {
        if (err) {
          console.log('Error creating mapping', err);
        }
        verbose && console.log('Created mapping', resp);
        callback();
      });
    } else {
      callback();
    }
  }
}
