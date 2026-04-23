/**
 * Tiny dev-gated logger. `error` and `warn` always pass through; `debug` and
 * `info` are silenced in production builds.
 *
 * Phase 5 will migrate stray `console.log` calls to `logger.debug`.
 */

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
