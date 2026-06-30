export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.error(...args);
  },
};
