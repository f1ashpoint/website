type Level = 'info' | 'warn' | 'error';
export function log(level: Level, msg: string, meta: Record<string, unknown> = {}) {
  if (process.env.VITEST) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta });
  (level === 'error' ? console.error : console.log)(line);
}
export const logError = (msg: string, err: unknown, meta: Record<string, unknown> = {}) =>
  log('error', msg, { ...meta, err: err instanceof Error ? { message: err.message, stack: err.stack } : String(err) });
