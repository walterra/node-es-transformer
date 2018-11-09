import elasticsearch from 'elasticsearch';

import createMappingFactory from './_create-mapping';
import fileReaderFactory from './_file-reader';
import indexQueueFactory from './_index-queue';
import indexReaderFactory from './_index-reader';

export default function transformer({
  deleteIndex = false,
  host = 'localhost',
  port = '9200',
  bufferSize = 1000,
  fileName,
  splitRegex = /\n/,
  sourceIndexName,
  targetIndexName,
  typeName,
  mappings,
  skipHeader = false,
  transform,
  verbose = true,
}) {
  if (typeof targetIndexName === 'undefined') {
    throw Error('targetIndexName must be specified.');
  }

  const client = new elasticsearch.Client({ host: `${host}:${port}` });

  const createMapping = createMappingFactory({
    client, targetIndexName, mappings, verbose,
  });
  const indexer = indexQueueFactory({
    client, targetIndexName, typeName, bufferSize, skipHeader, verbose,
  });

  function getReader() {
    if (typeof fileName !== 'undefined' && typeof sourceIndexName !== 'undefined') {
      throw Error('Only either one of fileName or sourceIndexName can be specified.');
    }

    if (typeof fileName === 'undefined' && typeof sourceIndexName === 'undefined') {
      throw Error('Either fileName or sourceIndexName must be specified.');
    }

    if (typeof fileName !== 'undefined') {
      return fileReaderFactory(indexer, fileName, transform, splitRegex, verbose);
    }

    if (typeof sourceIndexName !== 'undefined') {
      return indexReaderFactory(indexer, sourceIndexName, transform, client);
    }

    return null;
  }

  const reader = getReader();

  client.indices.exists({ index: targetIndexName }, (err, resp) => {
    if (resp === false) {
      createMapping().then(reader);
    } else if (deleteIndex === true) {
      client.indices.delete({ index: targetIndexName }, () => {
        createMapping().then(reader);
      });
    } else {
      reader();
    }
  });
}
