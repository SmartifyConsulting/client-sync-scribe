/**
 * Dev-only logger used to gate verbose `console.log` calls.
 *
 * Phase 5 has migrated the noisiest hooks (`useSessions`,
 * `useAudioRecording`, `useGoogleCalendar`) to `logger.debug`. Other
 * call sites can adopt this incrementally; nothing is forced.
 *
 * `console.error` and `console.warn` are intentionally untouched —
 * those should always reach production logs.
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
