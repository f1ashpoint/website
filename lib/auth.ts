import crypto from 'crypto';
import { getDb } from './db';
import { HttpError, readCookie } from './http';

export const ADMIN_COOKIE = 'csc_admin';
const SESSION_HOURS = 12;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters.');
  return s;
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function signSession(adminId: number, now = Date.now()): string {
  const body = b64(JSON.stringify({ id: adminId, exp: now + SESSION_HOURS * 3600_000 }));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verifySession(token: string | undefined, now = Date.now()): { id: number } | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof p.id !== 'number' || typeof p.exp !== 'number' || p.exp < now) return null;
    const row = getDb().prepare('SELECT id FROM admins WHERE id = ?').get(p.id);
    return row ? { id: p.id } : null;
  } catch { return null; }
}
export function sessionCookie(token: string, clear = false) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_HOURS * 3600}${secure}`;
}

/** Use at the top of every admin API route. Throws 401 if unauthenticated, 403 on cross-origin writes. */
export function requireAdmin(req: Request): { id: number } {
  const s = verifySession(readCookie(req, ADMIN_COOKIE));
  if (!s) throw new HttpError(401, 'Please sign in to continue.');
  if (!['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Cross-origin request blocked.');
  }
  return s;
}

const attempts = new Map<string, { n: number; reset: number }>();
export function loginRateLimit(key: string, now = Date.now()) {
  const a = attempts.get(key);
  if (!a || a.reset < now) { attempts.set(key, { n: 1, reset: now + 15 * 60_000 }); return; }
  if (++a.n > 8) throw new HttpError(429, 'Too many sign-in attempts. Please wait 15 minutes.');
}
export const resetLoginAttempts = () => attempts.clear();

export function login(email: string, password: string): number | null {
  const row = getDb().prepare('SELECT id, password_hash FROM admins WHERE email = ?').get(email.trim().toLowerCase()) as { id: number; password_hash: string } | undefined;
  // Always run a hash so timing does not reveal whether the email exists.
  const ok = verifyPassword(password, row?.password_hash ?? 'scrypt$00$00');
  return row && ok ? row.id : null;
}
