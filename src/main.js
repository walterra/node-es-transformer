import elasticsearch from '@elastic/elasticsearch';

import createMappingFactory from './_create-mapping';
import fileReaderFactory from './_file-reader';
import indexQueueFactory from './_index-queue';
import indexReaderFactory from './_index-reader';

export default async function transformer({
  deleteIndex = false,
  sourceClientConfig,
  targetClientConfig,
  bufferSize = 1000,
  fileName,
  splitRegex = /\n/,
  sourceIndexName,
  targetIndexName,
  mappings,
  mappingsOverride = false,
  indexMappingTotalFieldsLimit,
  query,
  skipHeader = false,
  transform,
  verbose = true,
}) {
  if (typeof targetIndexName === 'undefined') {
    throw Error('targetIndexName must be specified.');
  }

  const defaultClientConfig = {
    node: 'http://localhost:9200',
  };

  const sourceClient = new elasticsearch.Client(sourceClientConfig || defaultClientConfig);
  const targetClient = new elasticsearch.Client(
    targetClientConfig || sourceClientConfig || defaultClientConfig,
  );

  const createMapping = createMappingFactory({
    sourceClient,
    sourceIndexName,
    targetClient,
    targetIndexName,
    mappings,
    mappingsOverride,
    indexMappingTotalFieldsLimit,
    verbose,
  });
  const indexer = indexQueueFactory({
    targetClient,
    targetIndexName,
    bufferSize,
    skipHeader,
    verbose,
  });

  function getReader() {
    if (
      typeof fileName !== 'undefined'
      && typeof sourceIndexName !== 'undefined'
    ) {
      throw Error(
        'Only either one of fileName or sourceIndexName can be specified.',
      );
    }

    if (
      typeof fileName === 'undefined'
      && typeof sourceIndexName === 'undefined'
    ) {
      throw Error('Either fileName or sourceIndexName must be specified.');
    }

    if (typeof fileName !== 'undefined') {
      return fileReaderFactory(
        indexer,
        fileName,
        transform,
        splitRegex,
        verbose,
      );
    }

    if (typeof sourceIndexName !== 'undefined') {
      return indexReaderFactory(
        indexer,
        sourceIndexName,
        transform,
        sourceClient,
        query,
      );
    }

    return null;
  }

  const reader = getReader();

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
  } catch (error) {
    console.error('Error checking index existence:', error);
  } finally {
    // targetClient.close();
  }

  return { events: indexer.queueEmitter };
}
