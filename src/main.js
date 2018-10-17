import fs from 'fs';
import es from 'event-stream';
import elasticsearch from 'elasticsearch';
import glob from 'glob';

import { createMappingFactory } from './_create-mapping';
import { fileReaderFactory } from './_file-reader';
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
	const indexFile = fileReaderFactory(indexer);

	client.indices.exists({
		index: targetIndexName
	}, (err, resp) => {
		if (resp === false) {
			createMapping().then(() => indexFile(fileName));
		} else {
			if (deleteIndex === true) {
				client.indices.delete({
					index: targetIndexName
				}, (err, resp) => {
					createMapping().then(() => indexFile(fileName));
				});
			} else {
				indexFile(fileName);
			}
		}
	});
}
