export default function createMappingFactory({
  sourceClient,
  sourceIndexName,
  targetClient,
  targetIndexName,
  mappings,
  verbose,
}) {
  return async () => {
    if (sourceClient && sourceIndexName && typeof mappings === 'undefined') {
      try {
        const mapping = await sourceClient.indices.getMapping({ index: sourceIndexName });
        mappings = mapping[sourceIndexName].mappings;
      } catch (err) {
        console.log('Error reading source mapping', err);
        return;
      }
    }

    if (typeof mappings === 'object' && mappings !== null) {
      try {
        const resp = await targetClient.indices.create(
          {
            index: targetIndexName,
            body: { mappings },
          },
        );
        if (verbose) console.log('Created target mapping', resp);
      } catch (err) {
        console.log('Error creating target mapping', err);
      }
    }
  };
}
