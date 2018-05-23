export function createMappingFactory({ client, indexName, mappings, verbose }) {
  return () => (new Promise((resolve, reject) => {
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
          reject();
          return;
        }
        verbose && console.log('Created mapping', resp);
        resolve();
      });
    } else {
      resolve();
    }
  }));
}
