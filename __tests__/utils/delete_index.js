const retry = require('async-retry');

module.exports = (client, indexName) => async () => {
  await client.indices.delete({
    index: indexName,
  });

  await retry(async () => {
    const exists = await client.indices.exists({ index: indexName });

    if (exists) {
      throw new Error(`Index '${indexName} still exists`);
    }
  });
};
