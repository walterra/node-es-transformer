export default function createMappingFactory({
  sourceClient,
  sourceIndexName,
  targetClient,
  targetIndexName,
  mappings,
  mappingsOverride,
  indexMappingTotalFieldsLimit,
  verbose,
  deleteIndex,
  pipeline,
}) {
  return async () => {
    let targetMappings = mappingsOverride ? undefined : mappings;

    if (sourceClient && sourceIndexName && typeof targetMappings === 'undefined') {
      try {
        const mapping = await sourceClient.indices.getMapping({
          index: sourceIndexName,
        });
        if (mapping[sourceIndexName]) {
          targetMappings = mapping[sourceIndexName].mappings;
        } else {
          const allMappings = Object.values(mapping);
          if (allMappings.length > 0) {
            targetMappings = Object.values(mapping)[0].mappings;
          }
        }
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
        const indexExists = await targetClient.indices.exists({ index: targetIndexName });

        if (indexExists === true && deleteIndex === true) {
          await targetClient.indices.delete({ index: targetIndexName });
        }

        if (indexExists === false || deleteIndex === true) {
          const resp = await targetClient.indices.create({
            index: targetIndexName,
            mappings: targetMappings,
            ...(pipeline !== undefined
              ? {
                  settings: {
                    index: {
                      default_pipeline: pipeline,
                    },
                  },
                }
              : {}),
            ...(indexMappingTotalFieldsLimit !== undefined
              ? {
                  settings: {
                    'index.mapping.total_fields.limit': indexMappingTotalFieldsLimit,
                    'index.number_of_shards': 1,
                    'index.number_of_replicas': 0,
                  },
                }
              : {}),
          });
          if (verbose) console.log('Created target mapping', resp);
        }
      } catch (err) {
        console.log('Error creating target mapping', err);
      }
    }
  };
}
