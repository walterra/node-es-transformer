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
) {
  return async function indexReader() {
    const responseQueue = [];
    let docsNum = 0;

    function search() {
      return client.search({
        index: sourceIndexName,
        scroll: '30s',
        size: bufferSize,
        query,
      });
    }

    function scroll(id) {
      return client.scroll({
        scroll_id: id,
        scroll: '30s',
      });
    }

    // start things off by searching, setting a scroll timeout, and pushing
    // our first response into the queue to be processed
    const se = await search();
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
        // console.log('check count', response.hits.total.value, docsNum);
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
