import fs from 'fs';
import es from 'event-stream';
import elasticsearch from 'elasticsearch';
import glob from 'glob';

import { createMappingFactory } from './_create-mapping';
import { indexQueueFactory } from './_index-queue';

export function transformer({
	deleteIndex = false,
	host = 'localhost',
	port = '9200',
	bufferSize = 1000,
	fileName,
	targetIndexName,
	typeName,
	mappings,
	skipHeader = false,
	transform,
	verbose = true
}) {

	const client = new elasticsearch.Client({
		host: `${host}:${port}`
	});

	const createMapping = createMappingFactory({ client, targetIndexName, mappings, verbose });
	const indexer = indexQueueFactory({ client, targetIndexName, typeName, bufferSize, skipHeader, verbose });

	client.indices.exists({
		index: targetIndexName
	}, (err, resp) => {
		if (resp === false) {
			createMapping().then(indexFile);
		} else {
			if (deleteIndex === true) {
				client.indices.delete({
					index: targetIndexName
				}, (err, resp) => {
					createMapping().then(indexFile);
				});
			} else {
				indexFile();
			}
		}
	});

	function indexFile() {
		glob(fileName, function (er, files) {
			startIndex(files);
		});
	}

	function startIndex(files) {
		const file = files.shift();
		const s = fs.createReadStream(file)
			.pipe(es.split())
			.pipe(es.mapSync(function (line) {
				s.pause();
				try {
					const doc = (typeof transform === 'function') ? transform(line) : line;
					// if doc is undefined we'll skip indexing it
					if (typeof doc === 'undefined') {
						s.resume();
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
			})
			.on('error', function (err) {
				console.log('Error while reading file.', err);
			})
			.on('end', function () {
				verbose && console.log('Read entire file: ', file);
				indexer.finish();
				if (files.length > 0) {
					startIndex(files);
				}
			})
		);

		indexer.queueEmitter.on('resume', () => {
			s.resume();
		});
	}
}
