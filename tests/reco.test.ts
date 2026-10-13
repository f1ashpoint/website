import { describe, it, expect, beforeEach } from 'vitest';
import { freshDb, addProduct } from './helpers';
import { recordEvent } from '@/lib/behavior';
import { getRecommendations } from '@/lib/reco';

const V = 'a'.repeat(32);
beforeEach(() => { freshDb(); });
describe('recommendations use on-site behaviour only', () => {
  it('falls back to new arrivals with an honest label when there is no history', () => {
    addProduct({ name: 'Ab' }); const r = getRecommendations(undefined, 4);
    expect(r[0].tier).toBe('new'); expect(r[0].reason).toBe('New from the studio');
  });
  it('ranks purchased category above viewed and excludes owned items', () => {
    const bought = addProduct({ name: 'Bought', categories: ['ceramics'] });
    const viewed = addProduct({ name: 'Viewed', categories: ['clay'] });
    const c = addProduct({ name: 'Mug2', categories: ['ceramics'] }); const d = addProduct({ name: 'Charm2', categories: ['clay'] });
    recordEvent(V, bought, 'purchase'); recordEvent(V, viewed, 'view');
    const r = getRecommendations(V, 4);
    expect(r.map((x) => x.product.id)).not.toContain(bought);
    expect(r[0].product.id).toBe(c); expect(r[0].tier).toBe('purchased'); expect(r[0].reason).toContain('Bought');
    expect(r.find((x) => x.product.id === d)?.tier).toBe('viewed');
  });
});
