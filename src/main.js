import fs from 'fs';
import es from 'event-stream';
import elasticsearch from 'elasticsearch';

import { createMappingFactory } from './_create-mapping';

export function transformer({
	deleteIndex = false,
	host = 'localhost',
	port = '9200',
	fileName,
	indexName,
	typeName,
	mappings,
	transform,
	verbose = true
}) {

	const client = new elasticsearch.Client({
		host: `${host}:${port}`
	});

	const createMapping = createMappingFactory({ client, indexName, mappings, verbose });

	client.indices.exists({
		index: indexName
	}, (err, resp) => {
		if (resp === false) {
			createMapping().then(indexFile);
		} else {
			if (deleteIndex === true) {
				client.indices.delete({
					index: indexName
				}, (err, resp) => {
					createMapping().then(indexFile);
				});
			} else {
				indexFile();
			}
		}
	});

	function indexFile() {
		const docs = [];
		const s = fs.createReadStream(fileName)
			.pipe(es.split())
			.pipe(es.mapSync(function (line) {
				s.pause();

				if (line) {
					try {
						const header = { index: { _index: indexName, _type: typeName } };

						const doc = (typeof transform === 'function') ? transform(line) : line;

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
					verbose && console.log('Read entire file.')
					client.bulk({
						body: docs
					}, (err, resp) => {
						if (err) {
							console.log('Ingest Error:', err);
						}
					});
				})
			);
	}
}
