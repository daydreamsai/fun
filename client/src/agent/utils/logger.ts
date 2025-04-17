// path: src/utils/logger.ts

/**
 * Minimal logger that only logs in development environment.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  info: (msg: string): void => {
    if (isDev) console.log(`[INFO] ${msg}`);
  },
  error: (msg: string): void => {
    if (isDev) console.error(`[ERROR] ${msg}`);
  },
  warn: (msg: string): void => {
    if (isDev) console.warn(`[WARN] ${msg}`);
  },
  success: (msg: string): void => {
    if (isDev) console.log(`[SUCCESS] ${msg}`);
  },
};
