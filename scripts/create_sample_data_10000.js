const fs = require('fs');

const stream = fs.createWriteStream('./data/sample_data_10000.ndjson', { flags: 'a' });

const randomItemFromArray = items => items[~~(items.length * Math.random())];

const codes = [200, 404, 500];
const urls = ['login.php', 'post.php', 'home.php'];

[...Array(10000)].forEach((item, index) => {
  stream.write(
    `${JSON.stringify({
      the_index: index,
      code: randomItemFromArray(codes),
      url: randomItemFromArray(urls),
    })}\n`,
  );
});
