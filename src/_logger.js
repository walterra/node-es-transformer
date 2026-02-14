import pino from 'pino';

const DEFAULT_LOG_LEVEL = 'info';

function resolveLogLevel(verbose = true) {
  if (typeof process.env.LOG_LEVEL === 'string' && process.env.LOG_LEVEL.trim() !== '') {
    return process.env.LOG_LEVEL;
  }

  return verbose ? DEFAULT_LOG_LEVEL : 'error';
}

export default function createLogger({ logger, verbose = true } = {}) {
  if (logger && typeof logger === 'object') {
    return logger;
  }

  return pino({
    name: 'node-es-transformer',
    level: resolveLogLevel(verbose),
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  });
}

export function createChildLogger(logger, bindings) {
  if (!logger || typeof logger.child !== 'function') {
    return logger;
  }

  return logger.child(bindings);
}
