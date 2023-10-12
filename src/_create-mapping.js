export default function createMappingFactory({
  sourceClient,
  sourceIndexName,
  targetClient,
  targetIndexName,
  mappings,
  mappingsOverride,
  indexMappingTotalFieldsLimit,
  verbose,
}) {
  return async () => {
    let targetMappings = mappingsOverride ? undefined : mappings;

    if (sourceClient && sourceIndexName && typeof targetMappings === 'undefined') {
      try {
        const mapping = await sourceClient.indices.getMapping({
          index: sourceIndexName,
        });
        targetMappings = mapping[sourceIndexName].mappings;
      } catch (err) {
        console.log('Error reading source mapping', err);
        return;
      }
    }

    if (typeof targetMappings === 'object' && targetMappings !== null) {
      if (mappingsOverride) {
        targetMappings = {
          ...targetMappings,
          properties: {
            ...targetMappings.properties,
            ...mappings,
          },
        };
      }

      try {
        const resp = await targetClient.indices.create({
          index: targetIndexName,
          body: {
            mappings: targetMappings,
            ...(indexMappingTotalFieldsLimit !== undefined
              ? {
                  settings: {
                    'index.mapping.total_fields.limit': indexMappingTotalFieldsLimit,
                  },
                }
              : {}),
          },
        });
        if (verbose) console.log('Created target mapping', resp);
      } catch (err) {
        console.log('Error creating target mapping', err);
      }
    }
  };
}
