const fs = require('fs');

const stream = fs.createWriteStream('./data/sample_data_100.ndjson', { flags: 'a' });

const randomItemFromArray = items => items[~~(items.length * Math.random())];

const codes = [200];
const urls = ['share.php'];

[...Array(100)].forEach((item, index) => {
  stream.write(
    `${JSON.stringify({
      the_index: index,
      code: randomItemFromArray(codes),
      url: randomItemFromArray(urls),
    })}\n`,
  );
});
