import config from "../config";

/**
 * Lightweight logging helper that standardizes console output.
 *
 * This wrapper can later be replaced with a structured logger
 * such as Pino or Sentry without requiring broad refactors.
 */
const logger = {
  info: (...args: unknown[]) => {
    console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (config.isProduction) {
      return;
    }

    console.debug('[DEBUG]', ...args);
  },
} as const;

export default logger;
