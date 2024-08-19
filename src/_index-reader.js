import cliProgress from 'cli-progress';

import { DEFAULT_BUFFER_SIZE } from './_constants';

const MAX_QUEUE_SIZE = 15;

// create a new progress bar instance and use shades_classic theme
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

export default function indexReaderFactory(
  indexer,
  sourceIndexName,
  transform,
  client,
  query,
  bufferSize = DEFAULT_BUFFER_SIZE,
  populatedFields = false,
) {
  return async function indexReader() {
    const responseQueue = [];
    let docsNum = 0;

    async function fetchPopulatedFields() {
      try {
        const response = await client.search({
          index: sourceIndexName,
          size: bufferSize,
          query: {
            function_score: {
              query,
              random_score: {},
            },
          },
        });

        // Get all field names for each returned doc and flatten it
        // to a list of unique field names used across all docs.
        return Array.from(new Set(response.hits.hits.map(d => Object.keys(d._source)).flat(1)));
      } catch (e) {
        console.log('error', e);
      }
    }

    function search(fields) {
      return client.search({
        index: sourceIndexName,
        scroll: '600s',
        size: bufferSize,
        query,
        ...(fields ? { _source: fields } : {}),
      });
    }

    function scroll(id) {
      return client.scroll({
        scroll_id: id,
        scroll: '600s',
      });
    }

    let fieldsWithData;

    // identify populated fields
    if (populatedFields) {
      fieldsWithData = await fetchPopulatedFields();
    }

    // start things off by searching, setting a scroll timeout, and pushing
    // our first response into the queue to be processed
    const se = await search(fieldsWithData);
    responseQueue.push(se);
    progressBar.start(se.hits.total.value, 0);

    function processHit(hit) {
      docsNum += 1;
      try {
        const doc = typeof transform === 'function' ? transform(hit._source) : hit._source; // eslint-disable-line no-underscore-dangle

        // if doc is undefined we'll skip indexing it
        if (typeof doc === 'undefined') {
          return;
        }

        // the transform callback may return an array of docs so we can emit
        // multiple docs from a single line
        if (Array.isArray(doc)) {
          doc.forEach(d => indexer.add(d));
          return;
        }

        indexer.add(doc);
      } catch (e) {
        console.log('error', e);
      }
    }

    let ingestQueueSize = 0;
    let scrollId = se._scroll_id; // eslint-disable-line no-underscore-dangle
    let readActive = false;

    async function processResponseQueue() {
      while (responseQueue.length) {
        readActive = true;
        const response = responseQueue.shift();

        // collect the docs from this response
        response.hits.hits.forEach(processHit);

        progressBar.update(docsNum);

        // check to see if we have collected all of the docs
        if (response.hits.total.value === docsNum) {
          indexer.finish();
          break;
        }

        if (ingestQueueSize < MAX_QUEUE_SIZE) {
          // get the next response if there are more docs to fetch
          const sc = await scroll(response._scroll_id); // eslint-disable-line no-await-in-loop,no-underscore-dangle,max-len
          scrollId = sc._scroll_id; // eslint-disable-line no-underscore-dangle
          responseQueue.push(sc);
        } else {
          readActive = false;
        }
      }
    }

    indexer.queueEmitter.on('queue-size', async size => {
      ingestQueueSize = size;

      if (!readActive && ingestQueueSize < MAX_QUEUE_SIZE) {
        // get the next response if there are more docs to fetch
        const sc = await scroll(scrollId); // eslint-disable-line no-await-in-loop,no-underscore-dangle,max-len
        scrollId = sc._scroll_id; // eslint-disable-line no-underscore-dangle
        responseQueue.push(sc);
        processResponseQueue();
      }
    });

    indexer.queueEmitter.on('resume', async () => {
      ingestQueueSize = 0;

      if (readActive) {
        return;
      }

      // get the next response if there are more docs to fetch
      const sc = await scroll(scrollId); // eslint-disable-line no-await-in-loop,no-underscore-dangle,max-len
      scrollId = sc._scroll_id; // eslint-disable-line no-underscore-dangle
      responseQueue.push(sc);
      processResponseQueue();
    });

    indexer.queueEmitter.on('finish', () => {
      progressBar.stop();
    });

    processResponseQueue();
  };
}
