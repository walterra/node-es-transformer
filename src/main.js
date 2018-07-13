import fs from 'fs';
import es from 'event-stream';
import elasticsearch from 'elasticsearch';

import { createMappingFactory } from './_create-mapping';
import { indexQueueFactory } from './_index-queue';

export function transformer({
	deleteIndex = false,
	host = 'localhost',
	port = '9200',
	bufferSize = 1000,
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
	const indexer = indexQueueFactory({ client, indexName, typeName, bufferSize, verbose });

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
		const s = fs.createReadStream(fileName)
			.pipe(es.split())
			.pipe(es.mapSync(function (line) {
				s.pause();
				try {
					const doc = (typeof transform === 'function') ? transform(line) : line;

					if (typeof doc === 'undefined') {
						//console.log('doc invalid');
						s.resume();
						return undefined;
					}

					indexer.add(doc);
				} catch (e) {
					console.log('error', e);
				}

			})
				.on('error', function (err) {
					console.log('Error while reading file.', err);
				})
				.on('end', function () {
					verbose && console.log('Read entire file.');
					indexer.finish();
				})
			);

		indexer.queueEmitter.on('resume', () => {
			s.resume();
		})
	}
}
