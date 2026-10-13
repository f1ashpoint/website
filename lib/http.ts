import { ZodError } from 'zod';
import { logError } from './log';

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message); }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
}

/** Wrap a route handler: converts thrown errors to safe JSON, logs details server-side only. */
export function handle(fn: (req: Request, ctx?: any) => Promise<Response>) {
  return async (req: Request, ctx?: any) => {
    try { return await fn(req, ctx); }
    catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, fields: e.fields }, e.status);
      if (e instanceof Error && e.name === 'SyntaxError') return json({ error: 'The request was not valid JSON.' }, 400);
      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const i of e.issues) fields[i.path.join('.') || '_'] = i.message;
        return json({ error: 'Please check the highlighted fields.', fields }, 400);
      }
      logError('unhandled api error', e, { url: req.url, method: req.method });
      return json({ error: 'Something went wrong on our side. Please try again in a moment.' }, 500);
    }
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
}
