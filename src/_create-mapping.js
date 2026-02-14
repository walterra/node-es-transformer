export default function createMappingFactory({
  sourceClient,
  sourceIndexName,
  targetClient,
  targetIndexName,
  mappings,
  inferredIngestPipeline,
  mappingsOverride,
  indexMappingTotalFieldsLimit,
  deleteIndex,
  pipeline,
  logger,
}) {
  return async () => {
    let targetMappings = mappingsOverride ? undefined : mappings;
    let defaultPipeline = pipeline;

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
        logger.error({ err, sourceIndexName }, 'Error reading source mapping');
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
          if (
            typeof defaultPipeline === 'undefined' &&
            typeof inferredIngestPipeline === 'object' &&
            inferredIngestPipeline !== null &&
            typeof targetClient?.ingest?.putPipeline === 'function'
          ) {
            const inferredPipelineName = `${targetIndexName}-inferred-pipeline`;

            try {
              await targetClient.ingest.putPipeline({
                id: inferredPipelineName,
                ...inferredIngestPipeline,
              });
              defaultPipeline = inferredPipelineName;
              logger.info({ inferredPipelineName }, 'Created inferred ingest pipeline');
            } catch (err) {
              logger.error(
                { err, inferredPipelineName },
                'Error creating inferred ingest pipeline',
              );
            }
          }

          const settings = {
            ...(defaultPipeline !== undefined
              ? {
                  'index.default_pipeline': defaultPipeline,
                }
              : {}),
            ...(indexMappingTotalFieldsLimit !== undefined
              ? {
                  'index.mapping.total_fields.limit': indexMappingTotalFieldsLimit,
                  'index.number_of_shards': 1,
                  'index.number_of_replicas': 0,
                }
              : {}),
          };

          const response = await targetClient.indices.create({
            index: targetIndexName,
            mappings: targetMappings,
            ...(Object.keys(settings).length > 0 ? { settings } : {}),
          });
          logger.info({ targetIndexName, response }, 'Created target mapping');
        }
      } catch (err) {
        logger.error({ err, targetIndexName }, 'Error creating target mapping');
      }
    }
  };
}
