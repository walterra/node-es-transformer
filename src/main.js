const fs = require('fs');
const es = require('event-stream');
const elasticsearch = require('elasticsearch');

export function transformer({
	host = 'localhost',
	port = '9200',
	fileName,
	indexName,
	typeName,
	mappings,
	transform = (d) => d
}) {

	const client = new elasticsearch.Client({
		host: `${host}:${port}`
	});

	client.indices.exists({
		index: indexName
	}, (err, resp) => {
		if (resp === false) {
			createMapping();
		} else {
			client.indices.delete({
				index: indexName
			}, (err, resp) => {
				createMapping();
			});
		}
	});

	function createMapping() {
		client.indices.create({
			index: indexName,
			body: {
				mappings
			}
		}, (err, resp) => {
			console.log('create mapping', err, resp);
			indexFile();
		});
	}

	function indexFile() {
		const docs = [];
		const s = fs.createReadStream(fileName)
			.pipe(es.split())
			.pipe(es.mapSync(function (line) {
				s.pause();

				if (line) {
					try {
						const header = { index: { _index: indexName, _type: typeName } };

						const doc = transform(line);

						docs.push(header);
						docs.push(doc);
					} catch (e) {
						console.log('error', e);
					}
				}

				// resume the readstream, possibly from a callback
				s.resume();
			})
				.on('error', function (err) {
					console.log('Error while reading file.', err);
				})
				.on('end', function () {
					console.log('Read entire file.')
					client.bulk({
						body: docs
					}, (err, resp) => {
						console.log('Ingest:', err);
					});
				})
			);
	}
}
