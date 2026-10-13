import crypto from 'crypto';
import { getDb } from './db';
import { getSettings, stateCode, type Settings } from './config';
import { HttpError } from './http';
import { priceOrder, type PriceResult } from './pricing';
import { dispatchDate } from './catalog';
import { checkoutSchema, type CheckoutInput } from './validation';
import { getShippingProvider } from './providers/shipping';
import { getPaymentProvider } from './providers/payment';
import { issueInvoice } from './invoice';
import { recordEvent } from './behavior';

export interface CartItem { variantId: number; qty: number; engraving?: string }
export interface ResolvedLine {
  key: string; variantId: number; productId: number; slug: string; name: string; variantLabel: string; image: string | null;
  qty: number; unitPaise: number; gstRate: number; hsn: string; madeToOrder: boolean; leadTimeDays: number | null;
  stock: number; maxQty: number; engraving: string; issue?: string;
}
type Row = Record<string, any>;

export function resolveCart(items: CartItem[]): ResolvedLine[] {
  const db = getDb(); const s = getSettings();
  const lines: ResolvedLine[] = [];
  for (const it of items) {
    const r = db.prepare(`SELECT v.id vid, v.label, v.stock, v.price_paise vprice, p.* FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?`).get(it.variantId) as Row | undefined;
    if (!r) { lines.push({ key: String(it.variantId), variantId: it.variantId, productId: 0, slug: '', name: 'Item no longer available', variantLabel: '', image: null, qty: it.qty, unitPaise: 0, gstRate: 0, hsn: '', madeToOrder: false, leadTimeDays: null, stock: 0, maxQty: 0, engraving: '', issue: 'This item is no longer available.' }); continue; }
    const cat = db.prepare('SELECT c.slug FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=? ORDER BY c.sort LIMIT 1').get(r.id) as { slug: string } | undefined;
    const img = db.prepare('SELECT url FROM product_images WHERE product_id=? ORDER BY sort, id LIMIT 1').get(r.id) as { url: string } | undefined;
    const mto = r.lead_time_days !== null;
    const engraving = r.engraving_enabled ? (it.engraving ?? '').slice(0, r.engraving_max) : '';
    const unit = (r.vprice ?? r.price_paise) + (engraving ? r.engraving_fee_paise : 0);
    const maxQty = mto ? 50 : r.stock;
    let issue: string | undefined;
    if (r.status !== 'active') issue = 'This item is no longer available.';
    else if (!mto && r.stock <= 0) issue = 'This item is sold out.';
    else if (!mto && it.qty > r.stock) issue = `Only ${r.stock} left. Please reduce the quantity.`;
    lines.push({ key: `${r.vid}|${engraving}`, variantId: r.vid, productId: r.id, slug: r.slug, name: r.name, variantLabel: r.label, image: img?.url ?? null,
      qty: it.qty, unitPaise: unit, gstRate: r.gst_rate ?? s.categoryGst[cat?.slug ?? ''] ?? 18, hsn: r.hsn, madeToOrder: mto, leadTimeDays: r.lead_time_days,
      stock: r.stock, maxQty, engraving, issue });
  }
  return lines;
}

export function pointsDiscount(points: number, itemsTotalPaise: number, balance: number, s: Settings) {
  const maxByCap = Math.floor((itemsTotalPaise * s.loyaltyMaxRedeemPct) / 100 / s.loyaltyPointValuePaise);
  const usable = Math.max(0, Math.min(points, balance, maxByCap));
  return { points: usable, discountPaise: usable * s.loyaltyPointValuePaise };
}
export const loyaltyBalance = (email: string) =>
  ((getDb().prepare('SELECT points FROM loyalty_members WHERE email=?').get(email.trim().toLowerCase()) as { points: number } | undefined)?.points) ?? 0;

export interface Quote {
  lines: ResolvedLine[]; price: PriceResult; intraState: boolean; stateKnown: boolean; dispatchBy: string | null;
  issues: string[]; redeemedPoints: number; shippingService: string; shippingQuotePaise: number;
}
export async function quoteCart(items: CartItem[], opts: { state?: string; pincode?: string; redeemPoints?: number; email?: string } = {}): Promise<Quote> {
  const s = getSettings();
  const lines = resolveCart(items);
  const valid = lines.filter((l) => !l.issue || l.issue.startsWith('Only') );
  const itemsTotal = valid.reduce((a, l) => a + l.unitPaise * l.qty, 0);
  const provider = getShippingProvider();
  const sq = await provider.quote({ destState: opts.state ?? s.originState, pincode: opts.pincode ?? '', itemsTotalPaise: itemsTotal, weightGrams: 300 * valid.reduce((a, l) => a + l.qty, 0) });
  const stateKnown = !!opts.state;
  const intra = opts.state ? opts.state === s.originState : true;
  const redeem = opts.redeemPoints && opts.email ? pointsDiscount(opts.redeemPoints, itemsTotal, loyaltyBalance(opts.email), s) : { points: 0, discountPaise: 0 };
  const price = priceOrder(valid.map((l) => ({ key: l.key, qty: l.qty, unitPaise: l.unitPaise, gstRate: l.gstRate })),
    { intraState: intra, shippingFlatPaise: sq.amountPaise, freeShippingThresholdPaise: s.freeShippingThresholdPaise, shippingGstRate: s.shippingGstRate }, redeem.discountPaise);
  const mto = valid.filter((l) => l.madeToOrder).map((l) => l.leadTimeDays ?? 0);
  return { lines, price, intraState: intra, stateKnown, dispatchBy: mto.length ? dispatchDate(Math.max(...mto)) : null,
    issues: lines.filter((l) => l.issue).map((l) => `${l.name}: ${l.issue}`), redeemedPoints: redeem.points, shippingService: sq.service, shippingQuotePaise: sq.amountPaise };
}

export function releaseExpiredOrders(now = new Date()) {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM orders WHERE status='pending_payment' AND expires_at < ?").all(now.toISOString()) as { id: number }[];
  for (const r of rows) cancelAndRestock(r.id, 'expired');
}
function cancelAndRestock(orderId: number, status: 'expired' | 'payment_failed' | 'cancelled') {
  const db = getDb();
  db.transaction(() => {
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as Row;
    if (!o || !['pending_payment'].includes(o.status)) return;
    const items = db.prepare('SELECT variant_id, qty, stock_reserved FROM order_items WHERE order_id=?').all(orderId) as Row[];
    for (const i of items) if (i.stock_reserved) db.prepare('UPDATE variants SET stock = stock + ? WHERE id=?').run(i.qty, i.variant_id);
    if (o.points_redeemed) {
      db.prepare('UPDATE loyalty_members SET points = points + ? WHERE email=?').run(o.points_redeemed, o.email);
      db.prepare('INSERT INTO loyalty_ledger (email, order_id, delta, reason) VALUES (?,?,?,?)').run(o.email, orderId, o.points_redeemed, 'Points returned: order not completed');
    }
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, orderId);
  })();
}

export async function createOrder(raw: unknown, visitorId?: string) {
  const input: CheckoutInput = checkoutSchema.parse(raw);
  if (input.country.toLowerCase() !== 'india' && input.country.toLowerCase() !== 'in')
    throw new HttpError(422, 'Sorry, we deliver within India only.', { country: 'We currently deliver within India only.' });
  const s = getSettings(); const db = getDb();
  releaseExpiredOrders();
  const ship = getShippingProvider();
  if (ship.serviceable && !(await ship.serviceable(input.pincode))) throw new HttpError(422, 'We cannot deliver to that PIN code yet.', { pincode: 'We cannot deliver to this PIN code.' });
  const q0 = await quoteCart(input.items, { state: input.state, pincode: input.pincode });

  const order = db.transaction(() => {
    const lines = resolveCart(input.items);
    const bad = lines.find((l) => l.issue);
    if (bad) throw new HttpError(409, `${bad.name}: ${bad.issue}`);
    const itemsTotal = lines.reduce((a, l) => a + l.unitPaise * l.qty, 0);
    let redeem = { points: 0, discountPaise: 0 };
    if (input.redeemPoints > 0) {
      redeem = pointsDiscount(input.redeemPoints, itemsTotal, loyaltyBalance(input.email), s);
      if (redeem.points === 0) throw new HttpError(422, 'You do not have enough points to redeem.', { redeemPoints: 'Not enough points.' });
    }
    const intra = input.state === s.originState;
    const price = priceOrder(lines.map((l) => ({ key: l.key, qty: l.qty, unitPaise: l.unitPaise, gstRate: l.gstRate })),
      { intraState: intra, shippingFlatPaise: q0.shippingQuotePaise, freeShippingThresholdPaise: s.freeShippingThresholdPaise, shippingGstRate: s.shippingGstRate }, redeem.discountPaise);
    const mto = lines.filter((l) => l.madeToOrder).map((l) => l.leadTimeDays ?? 0);
    const token = crypto.randomBytes(18).toString('hex');
    const expires = new Date(Date.now() + s.orderHoldMinutes * 60_000).toISOString();
    const oid = Number(db.prepare(`INSERT INTO orders (token, number, email, phone, name, ship_line1, ship_line2, ship_city, ship_state, ship_pincode, ship_country,
      items_total_paise, discount_paise, shipping_paise, total_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, shipping_taxable_paise, shipping_tax_paise, shipping_gst_rate,
      intra_state, loyalty_enrolled, points_redeemed, shipping_provider, dispatch_by, visitor_id, expires_at, payment_provider)
      VALUES (?,?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?)`).run(
      token, token.slice(0, 12), input.email, input.phone, input.name, input.line1, input.line2, input.city, input.state, input.pincode, 'India',
      price.itemsTotalPaise, price.discountPaise, price.shippingPaise, price.totalPaise, price.taxablePaise, price.cgstPaise, price.sgstPaise, price.igstPaise,
      price.shippingTaxablePaise, price.shippingTaxPaise, s.shippingGstRate, intra ? 1 : 0, input.joinLoyalty ? 1 : 0, redeem.points, ship.id,
      mto.length ? dispatchDate(Math.max(...mto)) : null, visitorId ?? null, expires, getPaymentProvider().id).lastInsertRowid);
    db.prepare('UPDATE orders SET number=? WHERE id=?').run(`CSC-${1000 + oid}`, oid);
    lines.forEach((l, i) => {
      const pl = price.lines[i];
      let reserved = 0;
      if (!l.madeToOrder) {
        const r = db.prepare('UPDATE variants SET stock = stock - ? WHERE id=? AND stock >= ?').run(l.qty, l.variantId, l.qty);
        if (r.changes === 0) throw new HttpError(409, `${l.name}: not enough stock.`);
        reserved = 1;
      }
      db.prepare(`INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, hsn, gst_rate, qty, unit_paise, gross_paise, discount_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, engraving, made_to_order, stock_reserved)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(oid, l.productId, l.variantId, l.name, l.variantLabel, l.hsn, l.gstRate, l.qty, l.unitPaise, pl.grossPaise, pl.discountPaise, pl.taxablePaise, pl.cgstPaise, pl.sgstPaise, pl.igstPaise, l.engraving, l.madeToOrder ? 1 : 0, reserved);
    });
    if (input.joinLoyalty) db.prepare('INSERT INTO loyalty_members (email, name) VALUES (?,?) ON CONFLICT(email) DO NOTHING').run(input.email, input.name);
    if (redeem.points) {
      db.prepare('UPDATE loyalty_members SET points = points - ? WHERE email=?').run(redeem.points, input.email);
      db.prepare('INSERT INTO loyalty_ledger (email, order_id, delta, reason) VALUES (?,?,?,?)').run(input.email, oid, -redeem.points, 'Redeemed at checkout');
    }
    return { id: oid, token, number: `CSC-${1000 + oid}`, totalPaise: price.totalPaise };
  })();

  const pay = await getPaymentProvider().createPayment({ orderNumber: order.number, orderToken: order.token, amountPaise: order.totalPaise, currency: 'INR', customer: { name: input.name, email: input.email, phone: input.phone } });
  db.prepare('UPDATE orders SET payment_ref=? WHERE id=?').run(pay.providerRef, order.id);
  return { ...order, payment: pay };
}

export function markPaid(token: string, providerRef = '') {
  const db = getDb(); const s = getSettings();
  return db.transaction(() => {
    const o = db.prepare('SELECT * FROM orders WHERE token=?').get(token) as Row | undefined;
    if (!o) throw new HttpError(404, 'Order not found.');
    if (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') return o.status as string;
    let status = 'paid';
    if (o.status === 'expired' || o.status === 'payment_failed' || o.status === 'cancelled') {
      // Late payment: try to take the stock again, otherwise flag for the owner to refund.
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id) as Row[];
      const ok = items.every((i) => i.made_to_order || (db.prepare('SELECT stock FROM variants WHERE id=?').get(i.variant_id) as Row | undefined)?.stock >= i.qty);
      if (ok) for (const i of items) if (!i.made_to_order) db.prepare('UPDATE variants SET stock = stock - ? WHERE id=?').run(i.qty, i.variant_id);
      else status = 'needs_refund';
      if (o.points_redeemed && ok) db.prepare('UPDATE loyalty_members SET points = MAX(0, points - ?) WHERE email=?').run(o.points_redeemed, o.email);
    }
    db.prepare("UPDATE orders SET status=?, paid_at=datetime('now'), payment_ref=COALESCE(NULLIF(?, ''), payment_ref) WHERE id=?").run(status, providerRef, o.id);
    if (status === 'paid') {
      issueInvoice(o.id);
      if (o.loyalty_enrolled) {
        const pts = Math.floor((o.items_total_paise - o.discount_paise) / 100 / s.loyaltyEarnPerRupees);
        if (pts > 0) {
          db.prepare('UPDATE loyalty_members SET points = points + ? WHERE email=?').run(pts, o.email);
          db.prepare('UPDATE orders SET points_earned=? WHERE id=?').run(pts, o.id);
          db.prepare('INSERT INTO loyalty_ledger (email, order_id, delta, reason) VALUES (?,?,?,?)').run(o.email, o.id, pts, 'Earned on order ' + o.number);
        }
      }
      if (o.visitor_id) for (const i of db.prepare('SELECT product_id FROM order_items WHERE order_id=?').all(o.id) as Row[]) recordEvent(o.visitor_id, i.product_id, 'purchase');
    }
    return status;
  })();
}
export function markFailed(token: string) {
  const o = getDb().prepare('SELECT id FROM orders WHERE token=?').get(token) as { id: number } | undefined;
  if (!o) throw new HttpError(404, 'Order not found.');
  cancelAndRestock(o.id, 'payment_failed');
}

export function getOrderByToken(token: string) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM orders WHERE token=?').get(token) as Row | undefined;
  if (!o) return null;
  return { order: o, items: db.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY id').all(o.id) as Row[] };
}
export const stateCodeOf = stateCode;
