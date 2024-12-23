import cliProgress from 'cli-progress';

import { DEFAULT_SEARCH_SIZE } from './_constants';

// create a new progress bar instance and use shades_classic theme
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

export default function indexReaderFactory(
  indexer,
  sourceIndexName,
  transform,
  client,
  query,
  searchSize = DEFAULT_SEARCH_SIZE,
  populatedFields = false,
) {
  return async function indexReader() {
    let docsNum = 0;
    let scrollId;
    let finished = false;
    let readActive = false;
    let backPressurePause = false;

    async function fetchPopulatedFields() {
      try {
        const response = await client.search({
          index: sourceIndexName,
          size: searchSize,
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
        size: searchSize,
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

    await fetchNextResponse();

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

    async function fetchNextResponse() {
      readActive = true;

      const sc = scrollId ? await scroll(scrollId) : await search(fieldsWithData);

      if (!scrollId) {
        progressBar.start(sc.hits.total.value, 0);
      }

      scrollId = sc._scroll_id;
      readActive = false;

      processResponse(sc);
    }

    async function processResponse(response) {
      // collect the docs from this response
      response.hits.hits.forEach(processHit);

      progressBar.update(docsNum);

      // check to see if we have collected all of the docs
      if (response.hits.total.value === docsNum) {
        indexer.finish();
        return;
      }

      if (!backPressurePause) {
        await fetchNextResponse();
      }
    }

    indexer.queueEmitter.on('pause', async () => {
      backPressurePause = true;
    });

    indexer.queueEmitter.on('resume', async () => {
      backPressurePause = false;

      if (readActive || finished) {
        return;
      }

      await fetchNextResponse();
    });

    indexer.queueEmitter.on('finish', () => {
      finished = true;
      progressBar.stop();
    });
  };
}
