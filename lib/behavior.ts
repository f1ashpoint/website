import { getDb } from './db';
export const VISITOR_COOKIE = 'csc_vid';
export const NOPERS_COOKIE = 'csc_nopers';

export function recordEvent(visitorId: string, productId: number, type: 'view' | 'cart' | 'purchase') {
  if (!/^[a-f0-9]{16,64}$/.test(visitorId)) return;
  getDb().prepare('INSERT INTO events (visitor_id, product_id, type) VALUES (?,?,?)').run(visitorId, productId, type);
}
export function eraseVisitor(visitorId: string) {
  getDb().prepare('DELETE FROM events WHERE visitor_id = ?').run(visitorId);
}
