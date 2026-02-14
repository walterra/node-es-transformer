import fs from 'fs';
import { globSync } from 'glob';

const DEFAULT_INFER_MAPPINGS_SAMPLE_BYTES = 100000;
const DEFAULT_INFER_MAPPINGS_LINES_TO_SAMPLE = 1000;

function readSample(filePath, sampleBytes) {
  const fd = fs.openSync(filePath, 'r');

  try {
    const buffer = Buffer.alloc(sampleBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, sampleBytes, 0);
    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

export default async function inferMappingsFromSource({
  targetClient,
  fileName,
  sourceFormat,
  csvOptions,
  skipHeader,
  mappings,
  inferMappings,
  inferMappingsOptions,
  verbose,
}) {
  if (!inferMappings || typeof mappings !== 'undefined' || typeof fileName === 'undefined') {
    return mappings;
  }

  if (
    typeof targetClient?.textStructure?.findStructure !== 'function' ||
    sourceFormat === 'xml' ||
    sourceFormat === 'semi_structured_text'
  ) {
    return mappings;
  }

  const files = globSync(fileName);

  if (files.length === 0) {
    if (verbose) console.log(`No files matched for mapping inference: ${fileName}`);
    return mappings;
  }

  const { sampleBytes = DEFAULT_INFER_MAPPINGS_SAMPLE_BYTES, ...requestParams } =
    inferMappingsOptions || {};

  const sampleText = readSample(files[0], sampleBytes);

  if (!sampleText || sampleText.trim() === '') {
    if (verbose) console.log('Skipping mapping inference because the sample text is empty.');
    return mappings;
  }

  const params = {
    body: sampleText,
    lines_to_sample: DEFAULT_INFER_MAPPINGS_LINES_TO_SAMPLE,
    ...requestParams,
  };

  if (typeof params.format === 'undefined') {
    params.format = sourceFormat === 'csv' ? 'delimited' : 'ndjson';
  }

  if (sourceFormat === 'csv') {
    if (typeof params.delimiter === 'undefined' && typeof csvOptions?.delimiter === 'string') {
      params.delimiter = csvOptions.delimiter;
    }

    if (typeof params.quote === 'undefined' && typeof csvOptions?.quote === 'string') {
      params.quote = csvOptions.quote;
    }

    if (typeof params.has_header_row === 'undefined' && typeof csvOptions?.columns === 'boolean') {
      params.has_header_row = csvOptions.columns;
    }

    if (typeof params.has_header_row === 'undefined' && skipHeader) {
      params.has_header_row = true;
    }
  }

  try {
    const response = await targetClient.textStructure.findStructure(params);

    if (response?.mappings && verbose) {
      console.log(`Inferred mappings via _text_structure/find_structure from ${files[0]}`);
    }

    return response?.mappings || mappings;
  } catch (error) {
    if (verbose) {
      console.log('Could not infer mappings via _text_structure/find_structure:', error.message);
    }

    return mappings;
  }
}
