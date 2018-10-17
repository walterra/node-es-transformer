export default function indexReaderFactory(indexer, sourceIndexName, transform, client) {
  return async function indexReader() {
    const responseQueue = [];
    let docsNum = 0;

    function search() {
      return client.search({
        index: sourceIndexName,
        scroll: '30s',
      });
    }

    function scroll(id) {
      return client.scroll({
        scrollId: id,
        scroll: '30s',
      });
    }

    // start things off by searching, setting a scroll timeout, and pushing
    // our first response into the queue to be processed
    const se = await search();
    responseQueue.push(se);

    function processHit(hit) {
      docsNum += 1;
      try {
        const doc = (typeof transform === 'function') ? transform(hit._source) : hit._source; // eslint-disable-line no-underscore-dangle,max-len
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

    while (responseQueue.length) {
      const response = responseQueue.shift();

      // collect the docs from this response
      response.hits.hits.forEach(processHit);

      // check to see if we have collected all of the docs
      if (response.hits.total === docsNum) {
        console.log('finished scrolling.');
        break;
      }

      // get the next response if there are more docs to fetch
      const sc = await scroll(response._scroll_id); // eslint-disable-line no-await-in-loop,no-underscore-dangle,max-len
      responseQueue.push(sc);
    }
  };
}
