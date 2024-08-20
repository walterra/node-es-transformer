// In earlier versions this was used to set the number of docs to index in a
// single bulk request. Since we switched to use the helpers.bulk() method from
// the ES client, this now translates to the `flushBytes` option of the helper.
// However, for kind of a backwards compability with the old values, this uses
// KBytes instead of Bytes. It will be multiplied by 1024 in the index queue.
export const DEFAULT_BUFFER_SIZE = 5120;

// The default number of docs to fetch in a single search request when reindexing.
export const DEFAULT_SEARCH_SIZE = 1000;
