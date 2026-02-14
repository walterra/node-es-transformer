// TypeScript definitions for node-es-transformer
// Project: https://github.com/walterra/node-es-transformer
// Definitions by: Walter Rafelsberger <https://github.com/walterra>

/// <reference types="node" />

import { Client as ElasticsearchClient } from 'es9';
import { ClientOptions } from 'es9';
import { MappingProperty } from 'es9/lib/api/types';
import { QueryDslQueryContainer } from 'es9/lib/api/types';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

/**
 * Elasticsearch mapping properties
 */
export interface Mappings {
  properties: Record<string, MappingProperty>;
}

/**
 * Transform function context (optional second parameter)
 */
export interface TransformContext {
  fileName?: string;
}

/**
 * CSV parser options (subset of csv-parse options plus passthrough support)
 */
export interface CsvOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  columns?: boolean | string[] | ((header: string[]) => string[]);
  bom?: boolean;
  trim?: boolean;
  skip_empty_lines?: boolean;
  from_line?: number;
  [key: string]: any;
}

/**
 * Mapping inference options for _text_structure/find_structure
 */
export interface InferMappingsOptions {
  sampleBytes?: number;
  lines_to_sample?: number;
  timeout?: string;
  charset?: string;
  delimiter?: string;
  quote?: string;
  has_header_row?: boolean;
  [key: string]: any;
}

/**
 * Transform function that processes each document
 * @param doc - The source document
 * @param context - Optional context information
 * @returns Transformed document(s), or null/undefined to skip
 */
export type TransformFunction = (
  doc: any,
  context?: TransformContext
) => any | any[] | null | undefined;

/**
 * Configuration options for node-es-transformer
 */
export interface TransformerOptions {
  /**
   * Target Elasticsearch index name (required)
   */
  targetIndexName: string;

  /**
   * Delete the target index if it exists before starting
   * @default false
   */
  deleteIndex?: boolean;

  /**
   * Pre-instantiated Elasticsearch client for source operations
   * If provided, sourceClientConfig is ignored
   */
  sourceClient?: ElasticsearchClient;

  /**
   * Pre-instantiated Elasticsearch client for target operations
   * If not provided, uses sourceClient or creates from sourceClientConfig
   */
  targetClient?: ElasticsearchClient;

  /**
   * Elasticsearch client configuration for source operations
   * @default { node: 'http://localhost:9200' }
   */
  sourceClientConfig?: ClientOptions;

  /**
   * Elasticsearch client configuration for target operations
   * If not provided, uses sourceClientConfig
   * @default { node: 'http://localhost:9200' }
   */
  targetClientConfig?: ClientOptions;

  /**
   * Force specific Elasticsearch client version for source (8 or 9)
   * If not provided, version is auto-detected
   */
  sourceClientVersion?: 8 | 9;

  /**
   * Force specific Elasticsearch client version for target (8 or 9)
   * If not provided, version is auto-detected
   */
  targetClientVersion?: 8 | 9;

  /**
   * Buffer size threshold in KBytes for bulk indexing
   * @default 5120
   */
  bufferSize?: number;

  /**
   * Number of documents to fetch per search request when reindexing
   * @default 100
   */
  searchSize?: number;

  /**
   * Source filename to ingest (supports wildcards)
   * Cannot be used with sourceIndexName or stream
   */
  fileName?: string;

  /**
   * Node.js readable stream to ingest from
   * Cannot be used with fileName or sourceIndexName
   */
  stream?: Readable;

  /**
   * Source format for file/stream ingestion
   * @default 'ndjson'
   */
  sourceFormat?: 'ndjson' | 'csv';

  /**
   * CSV parser options when sourceFormat is 'csv'
   */
  csvOptions?: CsvOptions;

  /**
   * Regular expression to split lines in file/stream
   * Used only when sourceFormat is 'ndjson'
   * @default /\n/
   */
  splitRegex?: RegExp;

  /**
   * Source Elasticsearch index name to reindex from
   * Cannot be used with fileName or stream
   */
  sourceIndexName?: string;

  /**
   * Elasticsearch document mappings for the target index
   * If reindexing and not provided, mappings are copied from source index
   */
  mappings?: Mappings;

  /**
   * Apply mappings on top of source index mappings when reindexing
   * @default false
   */
  mappingsOverride?: boolean;

  /**
   * Infer mappings for file sources via _text_structure/find_structure
   * Ignored when mappings is explicitly provided
   * @default false
   */
  inferMappings?: boolean;

  /**
   * Options for mapping inference via _text_structure/find_structure
   */
  inferMappingsOptions?: InferMappingsOptions;

  /**
   * Field limit for target index (index.mapping.total_fields.limit setting)
   */
  indexMappingTotalFieldsLimit?: number;

  /**
   * Ingest pipeline name to use during indexing
   */
  pipeline?: string;

  /**
   * Fetch sample documents to identify which fields are actually populated
   * Useful for optimizing indices with many mapped but unused fields
   * @default false
   */
  populatedFields?: boolean;

  /**
   * Elasticsearch query to filter documents from source index
   */
  query?: QueryDslQueryContainer;

  /**
   * Skip header line for file/stream ingestion
   * - NDJSON: skips the first non-empty line
   * - CSV: skips the first data line only when csvOptions.columns does not consume headers
   * @default false
   */
  skipHeader?: boolean;

  /**
   * Transform function to modify documents during ingestion
   */
  transform?: TransformFunction;

  /**
   * Enable verbose logging and progress bars
   * @default true
   */
  verbose?: boolean;
}

/**
 * Result returned by the transformer function
 */
export interface TransformerResult {
  /**
   * Event emitter for monitoring ingestion progress
   * Events: 'queued', 'indexed', 'complete', 'error'
   */
  events: EventEmitter;
}

/**
 * Main transformer function
 * @param options - Configuration options
 * @returns Promise that resolves when ingestion is complete
 */
declare function transformer(options: TransformerOptions): Promise<TransformerResult>;

export default transformer;
