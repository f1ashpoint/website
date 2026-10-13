import { z } from 'zod';
import { getDb } from './db';
import { getSettings } from './config';
import { toPaise } from './money';

export interface Variant { id: number; label: string; sku: string; pricePaise: number; stock: number }
export interface Product {
  id: number; slug: string; name: string; description: string; pricePaise: number; gstRate: number; hsn: string;
  leadTimeDays: number | null; madeToOrder: boolean; status: 'active' | 'archived'; featured: boolean;
  engraving: { enabled: boolean; max: number; feePaise: number };
  categories: { slug: string; name: string }[]; variants: Variant[]; images: { url: string; alt: string }[];
  addonIds: number[]; totalStock: number; inStock: boolean;
}

const istDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
/** Dispatch-by date for a made-to-order item ordered at `from`. Calendar days, IST. */
export function dispatchDate(leadDays: number, from = new Date()): string {
  return istDate(new Date(from.getTime() + leadDays * 86400_000));
}
export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

type Row = Record<string, any>;
function hydrate(rows: Row[]): Product[] {
  if (!rows.length) return [];
  const db = getDb(); const settings = getSettings();
  const ids = rows.map((r) => r.id); const q = ids.map(() => '?').join(',');
  const cats = db.prepare(`SELECT pc.product_id pid, c.slug, c.name FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id IN (${q}) ORDER BY c.sort`).all(...ids) as Row[];
  const vars = db.prepare(`SELECT * FROM variants WHERE product_id IN (${q}) ORDER BY sort, id`).all(...ids) as Row[];
  const imgs = db.prepare(`SELECT * FROM product_images WHERE product_id IN (${q}) ORDER BY sort, id`).all(...ids) as Row[];
  const adds = db.prepare(`SELECT product_id pid, addon_product_id aid FROM product_addons WHERE product_id IN (${q})`).all(...ids) as Row[];
  return rows.map((r) => {
    const categories = cats.filter((c) => c.pid === r.id).map((c) => ({ slug: c.slug, name: c.name }));
    const variants = vars.filter((v) => v.product_id === r.id).map((v) => ({ id: v.id, label: v.label, sku: v.sku, pricePaise: v.price_paise ?? r.price_paise, stock: v.stock }));
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    const madeToOrder = r.lead_time_days !== null;
    return {
      id: r.id, slug: r.slug, name: r.name, description: r.description, pricePaise: r.price_paise,
      gstRate: r.gst_rate ?? settings.categoryGst[categories[0]?.slug] ?? 18, hsn: r.hsn,
      leadTimeDays: r.lead_time_days, madeToOrder, status: r.status, featured: !!r.featured,
      engraving: { enabled: !!r.engraving_enabled, max: r.engraving_max, feePaise: r.engraving_fee_paise },
      categories, variants, images: imgs.filter((i) => i.product_id === r.id).map((i) => ({ url: i.url, alt: i.alt || r.name })),
      addonIds: adds.filter((a) => a.pid === r.id).map((a) => a.aid), totalStock, inStock: madeToOrder || totalStock > 0,
    };
  });
}

export interface Filters {
  category?: string; q?: string; minPaise?: number; maxPaise?: number; inStock?: boolean; madeToOrder?: boolean;
  sort?: 'new' | 'price-asc' | 'price-desc'; includeArchived?: boolean; featured?: boolean; limit?: number; ids?: number[];
}
export function listProducts(f: Filters = {}): Product[] {
  const where: string[] = []; const args: unknown[] = [];
  if (!f.includeArchived) where.push("p.status='active'");
  if (f.category) { where.push('EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND c.slug=?)'); args.push(f.category); }
  if (f.q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); args.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.minPaise !== undefined) { where.push('p.price_paise >= ?'); args.push(f.minPaise); }
  if (f.maxPaise !== undefined) { where.push('p.price_paise <= ?'); args.push(f.maxPaise); }
  if (f.featured) where.push('p.featured=1');
  if (f.madeToOrder) where.push('p.lead_time_days IS NOT NULL');
  if (f.inStock) where.push('(p.lead_time_days IS NOT NULL OR EXISTS (SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.stock>0))');
  if (f.ids) { if (!f.ids.length) return []; where.push(`p.id IN (${f.ids.map(() => '?').join(',')})`); args.push(...f.ids); }
  const order = f.sort === 'price-asc' ? 'p.price_paise ASC' : f.sort === 'price-desc' ? 'p.price_paise DESC' : 'p.id DESC';
  const sql = `SELECT p.* FROM products p ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ?`;
  return hydrate(getDb().prepare(sql).all(...args, f.limit ?? 200) as Row[]);
}
export const getProductBySlug = (slug: string, includeArchived = false) =>
  hydrate(getDb().prepare(`SELECT * FROM products WHERE slug=? ${includeArchived ? '' : "AND status='active'"}`).all(slug) as Row[])[0] ?? null;
export const getProductById = (id: number) => hydrate(getDb().prepare('SELECT * FROM products WHERE id=?').all(id) as Row[])[0] ?? null;
export const listCategories = () => getDb().prepare('SELECT slug, name, blurb FROM categories ORDER BY sort').all() as { slug: string; name: string; blurb: string }[];

export const productInput = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  description: z.string().trim().max(5000).default(''),
  priceInr: z.coerce.number().min(0).max(1_000_000),
  categories: z.array(z.string()).min(1, 'Pick at least one category'),
  gstRate: z.coerce.number().min(0).max(40).nullable().optional(),
  hsn: z.string().trim().max(10).default(''),
  leadTimeDays: z.coerce.number().int().min(0).max(120).nullable().optional(),
  featured: z.boolean().default(false),
  engraving: z.object({ enabled: z.boolean(), max: z.coerce.number().int().min(1).max(60).default(20), feeInr: z.coerce.number().min(0).max(10000).default(0) }).default({ enabled: false, max: 20, feeInr: 0 }),
  variants: z.array(z.object({
    id: z.number().int().optional(), label: z.string().trim().min(1, 'Variant label required').max(60),
    sku: z.string().trim().max(40).default(''), priceInr: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
    stock: z.coerce.number().int().min(0).max(100000),
  })).min(1, 'Add at least one variant (use "Standard" for a single option)').max(30),
  images: z.array(z.object({ url: z.string().min(1).max(300).regex(/^(\/api\/media\/[\w.-]+|\/products\/[\w.-]+|https:\/\/[^\s]+)$/, 'Invalid image URL'), alt: z.string().max(200).default('') })).max(10).default([]),
  addonIds: z.array(z.number().int()).max(6).default([]),
});
export type ProductInput = z.infer<typeof productInput>;

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item'; }

export function saveProduct(input: ProductInput, id?: number): number {
  const db = getDb();
  const cats = db.prepare('SELECT id, slug FROM categories').all() as { id: number; slug: string }[];
  const catIds = input.categories.map((s) => { const c = cats.find((x) => x.slug === s); if (!c) throw new Error('Unknown category: ' + s); return c.id; });
  const tx = db.transaction(() => {
    let pid = id;
    const lead = input.leadTimeDays ?? null;
    const vals = [input.name, input.description, toPaise(input.priceInr), input.gstRate ?? null, input.hsn, lead, input.featured ? 1 : 0,
      input.engraving.enabled ? 1 : 0, input.engraving.max, toPaise(input.engraving.feeInr)];
    if (pid) {
      db.prepare(`UPDATE products SET name=?, description=?, price_paise=?, gst_rate=?, hsn=?, lead_time_days=?, featured=?, engraving_enabled=?, engraving_max=?, engraving_fee_paise=?, updated_at=datetime('now') WHERE id=?`).run(...vals, pid);
    } else {
      let slug = slugify(input.name); let n = 1;
      while (db.prepare('SELECT 1 FROM products WHERE slug=?').get(slug)) slug = `${slugify(input.name)}-${++n}`;
      pid = Number(db.prepare(`INSERT INTO products (name, description, price_paise, gst_rate, hsn, lead_time_days, featured, engraving_enabled, engraving_max, engraving_fee_paise, slug) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(...vals, slug).lastInsertRowid);
    }
    db.prepare('DELETE FROM product_categories WHERE product_id=?').run(pid);
    catIds.forEach((c) => db.prepare('INSERT INTO product_categories VALUES (?,?)').run(pid, c));
    // Variants: update by id, insert new, remove those no longer listed (only if never ordered; else keep with stock 0).
    const existing = db.prepare('SELECT id FROM variants WHERE product_id=?').all(pid) as { id: number }[];
    const keep = new Set<number>();
    input.variants.forEach((v, i) => {
      const price = v.priceInr == null ? null : toPaise(v.priceInr);
      if (v.id && existing.some((e) => e.id === v.id)) {
        db.prepare('UPDATE variants SET label=?, sku=?, price_paise=?, stock=?, sort=? WHERE id=?').run(v.label, v.sku, price, v.stock, i, v.id); keep.add(v.id);
      } else keep.add(Number(db.prepare('INSERT INTO variants (product_id,label,sku,price_paise,stock,sort) VALUES (?,?,?,?,?,?)').run(pid, v.label, v.sku, price, v.stock, i).lastInsertRowid));
    });
    for (const e of existing) if (!keep.has(e.id)) {
      const used = db.prepare('SELECT 1 FROM order_items WHERE variant_id=?').get(e.id);
      if (used) db.prepare('UPDATE variants SET stock=0 WHERE id=?').run(e.id); else db.prepare('DELETE FROM variants WHERE id=?').run(e.id);
    }
    db.prepare('DELETE FROM product_images WHERE product_id=?').run(pid);
    input.images.forEach((im, i) => db.prepare('INSERT INTO product_images (product_id,url,alt,sort) VALUES (?,?,?,?)').run(pid, im.url, im.alt, i));
    db.prepare('DELETE FROM product_addons WHERE product_id=?').run(pid);
    input.addonIds.filter((a) => a !== pid).forEach((a) => db.prepare('INSERT OR IGNORE INTO product_addons VALUES (?,?)').run(pid, a));
    return pid!;
  });
  return tx();
}
export const setArchived = (id: number, archived: boolean) =>
  getDb().prepare("UPDATE products SET status=?, updated_at=datetime('now') WHERE id=?").run(archived ? 'archived' : 'active', id).changes > 0;
export const deleteProduct = (id: number) => getDb().prepare('DELETE FROM products WHERE id=?').run(id).changes > 0;
