export default function createMappingFactory({
  client,
  targetIndexName,
  mappings,
  verbose,
}) {
  return () => (new Promise((resolve, reject) => {
    console.log('targetIndexName', targetIndexName);
    if (
      typeof mappings === 'object'
      && mappings !== null
    ) {
      client.indices.create({
        index: targetIndexName,
        body: { mappings },
      }, (err, resp) => {
        if (err) {
          console.log('Error creating mapping', err);
          reject();
          return;
        }
        if (verbose) console.log('Created mapping', resp);
        resolve();
      });
    } else {
      resolve();
    }
  }));
}
