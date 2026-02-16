import parquet from '@dsnp/parquetjs';
import zlib from 'zlib';
import { PARQUET_COMPRESSION_METHODS } from '@dsnp/parquetjs/dist/lib/compression.js';

function registerZstdCompression() {
  if (PARQUET_COMPRESSION_METHODS.ZSTD) {
    return;
  }

  if (
    typeof zlib.zstdCompressSync !== 'function' ||
    typeof zlib.zstdDecompressSync !== 'function'
  ) {
    PARQUET_COMPRESSION_METHODS.ZSTD = {
      deflate() {
        throw new Error('ZSTD compression requires Node.js with zstd support.');
      },
      inflate() {
        throw new Error('ZSTD compression requires Node.js with zstd support.');
      },
    };
    return;
  }

  PARQUET_COMPRESSION_METHODS.ZSTD = {
    deflate(value) {
      return zlib.zstdCompressSync(value);
    },
    inflate(value) {
      return zlib.zstdDecompressSync(value);
    },
  };
}

registerZstdCompression();

export default parquet;
