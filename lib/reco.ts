import { getDb } from './db';
import { listProducts, getProductById, type Product } from './catalog';

export type Tier = 'purchased' | 'carted' | 'viewed' | 'new';
export interface Recommendation { product: Product; tier: Tier; reason: string }

/** On-site behaviour only. Tiers: purchased (strongest), carted, viewed, then new arrivals as a fallback. */
export function getRecommendations(visitorId: string | undefined, limit = 4, excludeIds: number[] = []): Recommendation[] {
  const db = getDb();
  const rows = visitorId
    ? (db.prepare('SELECT product_id pid, type FROM events WHERE visitor_id=? ORDER BY id DESC LIMIT 200').all(visitorId) as { pid: number; type: Tier }[])
    : [];
  const seen: Record<'purchased' | 'carted' | 'viewed', Set<number>> = { purchased: new Set(), carted: new Set(), viewed: new Set() };
  for (const r of rows) (r.type as string) === 'purchase' ? seen.purchased.add(r.pid) : (r.type as string) === 'cart' ? seen.carted.add(r.pid) : seen.viewed.add(r.pid);
  const weights: [keyof typeof seen, number, Tier, string][] = [['purchased', 3, 'purchased', 'Because you bought'], ['carted', 2, 'carted', 'Because you added to your cart:'], ['viewed', 1, 'viewed', 'Because you looked at']];

  const catScore = new Map<string, { score: number; tier: Tier; label: string; from: string }>();
  for (const [key, w, tier, label] of weights) for (const pid of seen[key]) {
    const p = getProductById(pid); if (!p) continue;
    for (const c of p.categories) {
      const cur = catScore.get(c.slug);
      if (!cur) catScore.set(c.slug, { score: w, tier, label, from: p.name });
      else { cur.score += w; if (w * 10 > 0 && weights.find((x) => x[2] === cur.tier)![1] < w) { cur.tier = tier; cur.label = label; cur.from = p.name; } }
    }
  }
  const owned = new Set([...seen.purchased, ...seen.carted, ...excludeIds]);
  const out: Recommendation[] = [];
  if (catScore.size) {
    const cands = listProducts({ inStock: true }).filter((p) => !owned.has(p.id));
    const scored = cands.map((p) => {
      let best: { score: number; tier: Tier; label: string; from: string } | undefined; let total = 0;
      for (const c of p.categories) { const s = catScore.get(c.slug); if (s) { total += s.score; if (!best || s.score > best.score) best = s; } }
      return { p, total, best };
    }).filter((x) => x.best).sort((a, b) => b.total - a.total || b.p.id - a.p.id);
    for (const x of scored.slice(0, limit)) out.push({ product: x.p, tier: x.best!.tier, reason: `${x.best!.label} ${x.best!.from}` });
  }
  if (out.length < limit) {
    const have = new Set([...out.map((o) => o.product.id), ...owned]);
    for (const p of listProducts({ inStock: true, limit: 40 })) {
      if (out.length >= limit) break;
      if (!have.has(p.id)) out.push({ product: p, tier: 'new', reason: 'New from the studio' });
    }
  }
  return out;
}
