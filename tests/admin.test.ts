import { describe, it, expect, beforeEach } from 'vitest';
import { freshDb, addAdmin, addProduct } from './helpers';
import { hashPassword, verifyPassword, signSession, verifySession, requireAdmin, login, ADMIN_COOKIE, loginRateLimit, resetLoginAttempts } from '@/lib/auth';
import { POST as createProduct, GET as listAdmin } from '@/app/api/admin/products/route';
import { DELETE as delProduct } from '@/app/api/admin/products/[id]/route';
import { PUT as putSettings } from '@/app/api/admin/settings/route';
import { POST as upload } from '@/app/api/admin/upload/route';
import { sniff } from '@/lib/media';

const body = { name: 'Via API', priceInr: 300, categories: ['clay'], variants: [{ label: 'Standard', stock: 4 }] };
const req = (method: string, cookie?: string, data?: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/admin/x', { method, headers: { 'Content-Type': 'application/json', host: 'localhost', ...(cookie ? { cookie: `${ADMIN_COOKIE}=${cookie}` } : {}), ...headers }, body: data ? JSON.stringify(data) : undefined });
beforeEach(() => { freshDb(); resetLoginAttempts(); });

describe('admin authentication', () => {
  it('hashes passwords and verifies them', () => { const h = hashPassword('pw12345678'); expect(h).not.toContain('pw12345678'); expect(verifyPassword('pw12345678', h)).toBe(true); expect(verifyPassword('nope', h)).toBe(false); });
  it('logs in only with the right credentials', () => { addAdmin(); expect(login('owner@example.com', 'correct horse battery')).toBeTypeOf('number'); expect(login('owner@example.com', 'wrong')).toBeNull(); expect(login('x@example.com', 'correct horse battery')).toBeNull(); });
  it('rejects tampered or expired session tokens', () => {
    const id = addAdmin(); const t = signSession(id);
    expect(verifySession(t)?.id).toBe(id);
    expect(verifySession(t.slice(0, -2) + 'xx')).toBeNull();
    expect(verifySession(signSession(id, Date.now() - 13 * 3600_000))).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
  it('rate limits repeated sign-in attempts', () => { for (let i = 0; i < 8; i++) loginRateLimit('1.2.3.4'); expect(() => loginRateLimit('1.2.3.4')).toThrow(/Too many/); });
});

describe('admin authorization on API routes', () => {
  it('returns 401 for anonymous callers on every admin endpoint', async () => {
    expect((await createProduct(req('POST', undefined, body))).status).toBe(401);
    expect((await listAdmin(req('GET'))).status).toBe(401);
    expect((await delProduct(req('DELETE'), { params: { id: '1' } })).status).toBe(401);
    expect((await putSettings(req('PUT', undefined, {}))).status).toBe(401);
    expect((await upload(req('POST'))).status).toBe(401);
    expect(() => requireAdmin(req('GET', 'garbage'))).toThrow();
  });
  it('lets a signed-in admin create and delete, validating input and blocking cross-origin writes', async () => {
    const id = addAdmin(); const t = signSession(id);
    const ok = await createProduct(req('POST', t, body)); expect(ok.status).toBe(201);
    const bad = await createProduct(req('POST', t, { ...body, categories: [] })); expect(bad.status).toBe(400);
    expect((await createProduct(req('POST', t, body, { origin: 'https://evil.example' }))).status).toBe(403);
    const { id: pid } = await ok.json(); expect((await delProduct(req('DELETE', t), { params: { id: String(pid) } })).status).toBe(200);
  });
  it('accepts only real images for upload', () => {
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('jpg');
    expect(sniff(Buffer.from('<svg onload=alert(1)>padding padding'))).toBeNull();
  });
});
