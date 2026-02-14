import elasticsearch9 from 'es9';
import elasticsearch8 from 'es8';

import { DEFAULT_BUFFER_SIZE, DEFAULT_SEARCH_SIZE } from './_constants';
import createMappingFactory from './_create-mapping';
import fileReaderFactory from './_file-reader';
import indexQueueFactory from './_index-queue';
import indexReaderFactory from './_index-reader';
import inferMappingsFromSource from './_infer-mappings';
import createLogger, { createChildLogger } from './_logger';
import streamReaderFactory from './_stream-reader';

/**
 * Detect Elasticsearch version by querying the cluster
 */
async function detectElasticsearchVersion(config) {
  try {
    // Try with v9 client first (most common for new setups)
    const testClient = new elasticsearch9.Client(config);
    const info = await testClient.info();
    const version = info.version?.number;
    await testClient.close();

    if (version) {
      const majorVersion = parseInt(version.split('.')[0], 10);
      return majorVersion;
    }
  } catch (e) {
    // If v9 client fails, try v8 client
    try {
      const testClient = new elasticsearch8.Client(config);
      const info = await testClient.info();
      const version = info.version?.number;
      await testClient.close();

      if (version) {
        const majorVersion = parseInt(version.split('.')[0], 10);
        return majorVersion;
      }
    } catch (e2) {
      // Could not detect version
    }
  }

  // Default to v9 if detection fails
  return 9;
}

/**
 * Create or validate an Elasticsearch client
 * @param {Object|Client} clientOrConfig - Either a client instance or config object
 * @param {Object} defaultConfig - Default configuration to use if creating a new client
 * @param {number} [forceVersion] - Force a specific ES client version (8 or 9)
 */
async function getOrCreateClient(clientOrConfig, defaultConfig, forceVersion) {
  // If already a client instance, return it
  if (clientOrConfig && typeof clientOrConfig.info === 'function') {
    return clientOrConfig;
  }

  const config = clientOrConfig || defaultConfig;

  // If version is forced, use the specified client
  if (forceVersion === 8) {
    return new elasticsearch8.Client(config);
  } else if (forceVersion === 9) {
    return new elasticsearch9.Client(config);
  }

  // Auto-detect version
  const majorVersion = await detectElasticsearchVersion(config);

  if (majorVersion >= 9) {
    return new elasticsearch9.Client(config);
  } else {
    return new elasticsearch8.Client(config);
  }
}

export default async function transformer({
  deleteIndex = false,
  sourceClient: sourceClientInput,
  targetClient: targetClientInput,
  sourceClientConfig,
  targetClientConfig,
  sourceClientVersion,
  targetClientVersion,
  bufferSize = DEFAULT_BUFFER_SIZE,
  searchSize = DEFAULT_SEARCH_SIZE,
  stream,
  fileName,
  sourceFormat = 'ndjson',
  csvOptions = {},
  splitRegex = /\n/,
  sourceIndexName,
  targetIndexName,
  mappings,
  mappingsOverride = false,
  inferMappings = false,
  inferMappingsOptions = {},
  indexMappingTotalFieldsLimit,
  pipeline,
  populatedFields = false,
  query,
  skipHeader = false,
  transform,
  verbose = true,
  logger: loggerInput,
}) {
  if (typeof targetIndexName === 'undefined') {
    throw Error('targetIndexName must be specified.');
  }

  const logger = createLogger({ logger: loggerInput, verbose });

  const defaultClientConfig = {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  };

  // Support both old (config) and new (client instance) patterns
  const sourceClient = await getOrCreateClient(
    sourceClientInput || sourceClientConfig,
    defaultClientConfig,
    sourceClientVersion,
  );

  const targetClient = await getOrCreateClient(
    targetClientInput || targetClientConfig || sourceClientInput || sourceClientConfig,
    defaultClientConfig,
    targetClientVersion,
  );

  const inferenceResult = await inferMappingsFromSource({
    targetClient,
    fileName,
    sourceFormat,
    csvOptions,
    skipHeader,
    mappings,
    inferMappings,
    inferMappingsOptions,
    logger: createChildLogger(logger, { component: 'mapping-inference' }),
  });

  const createMapping = createMappingFactory({
    sourceClient,
    sourceIndexName,
    targetClient,
    targetIndexName,
    mappings: inferenceResult.mappings,
    inferredIngestPipeline: inferenceResult.ingestPipeline,
    mappingsOverride,
    indexMappingTotalFieldsLimit,
    deleteIndex,
    pipeline,
    logger: createChildLogger(logger, { component: 'create-mapping' }),
  });
  const indexer = indexQueueFactory({
    targetClient,
    targetIndexName,
    bufferSize,
    logger: createChildLogger(logger, { component: 'index-queue' }),
  });

  function validateSourceFormat() {
    if (
      sourceFormat !== 'ndjson' &&
      sourceFormat !== 'csv' &&
      sourceFormat !== 'parquet' &&
      sourceFormat !== 'arrow'
    ) {
      throw Error(
        `Unsupported sourceFormat: ${sourceFormat}. Use "ndjson", "csv", "parquet", or "arrow".`,
      );
    }
  }

  function getReader() {
    if (typeof fileName !== 'undefined' && typeof sourceIndexName !== 'undefined') {
      throw Error('Only either one of fileName or sourceIndexName can be specified.');
    }

    if (
      (typeof fileName !== 'undefined' && typeof sourceIndexName !== 'undefined') ||
      (typeof fileName !== 'undefined' && typeof stream !== 'undefined') ||
      (typeof sourceIndexName !== 'undefined' && typeof stream !== 'undefined')
    ) {
      throw Error('Only one of fileName, sourceIndexName, or stream can be specified.');
    }

    if (typeof fileName !== 'undefined') {
      validateSourceFormat();
      return fileReaderFactory(
        indexer,
        fileName,
        transform,
        splitRegex,
        skipHeader,
        sourceFormat,
        csvOptions,
        createChildLogger(logger, { component: 'file-reader' }),
      );
    }

    if (typeof sourceIndexName !== 'undefined') {
      return indexReaderFactory(
        indexer,
        sourceIndexName,
        transform,
        sourceClient,
        query,
        searchSize,
        populatedFields,
        createChildLogger(logger, { component: 'index-reader' }),
      );
    }

    if (typeof stream !== 'undefined') {
      validateSourceFormat();
      return streamReaderFactory(
        indexer,
        stream,
        transform,
        splitRegex,
        skipHeader,
        sourceFormat,
        csvOptions,
        createChildLogger(logger, { component: 'stream-reader' }),
      );
    }

    return null;
  }

  const reader = getReader();

  if (typeof reader !== 'function') {
    throw Error('One of fileName, sourceIndexName, or stream must be specified.');
  }

  try {
    const indexExists = await targetClient.indices.exists({ index: targetIndexName });

    if (indexExists === false) {
      await createMapping();
      reader();
    } else if (deleteIndex === true) {
      await targetClient.indices.delete({ index: targetIndexName });
      await createMapping();
      reader();
    } else {
      reader();
    }
  } catch (err) {
    logger.error({ err, targetIndexName }, 'Error checking index existence');
  } finally {
    // targetClient.close();
  }

  return { events: indexer.queueEmitter };
}
