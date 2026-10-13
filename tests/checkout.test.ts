import { describe, it, expect, beforeEach } from 'vitest';
import { freshDb, addProduct, variantOf, address } from './helpers';
import { getDb } from '@/lib/db';
import { quoteCart, createOrder, markPaid, markFailed, releaseExpiredOrders, getOrderByToken } from '@/lib/orders';
import { HttpError } from '@/lib/http';

const tokenOf = async (items: any[], over: any = {}) => { const o = await createOrder({ ...address, items, ...over }); return (getDb().prepare('SELECT token FROM orders WHERE number=?').get(o.number) as { token: string }).token; };
beforeEach(() => { freshDb(); });

describe('cart quote', () => {
  it('prices from the database, ignoring anything the client sends', async () => {
    const p = addProduct({ priceInr: 500, categories: ['ceramics'] });
    const q = await quoteCart([{ variantId: variantOf(p), qty: 2 }]);
    expect(q.price.itemsTotalPaise).toBe(100000); expect(q.price.shippingPaise).toBe(0);
  });
  it('adds engraving fee only when supported', async () => {
    const p = addProduct({ priceInr: 500, engraving: { enabled: true, max: 10, feeInr: 100 } });
    const q = await quoteCart([{ variantId: variantOf(p), qty: 1, engraving: 'Asha' }]);
    expect(q.lines[0].unitPaise).toBe(60000);
    const p2 = addProduct({ name: 'Plain', priceInr: 500 });
    expect((await quoteCart([{ variantId: variantOf(p2), qty: 1, engraving: 'x' }])).lines[0].unitPaise).toBe(50000);
  });
  it('flags quantity above stock and made-to-order dispatch date', async () => {
    const p = addProduct({ variants: [{ label: 'S', stock: 2 }] });
    expect((await quoteCart([{ variantId: variantOf(p), qty: 3 }])).issues[0]).toMatch(/Only 2 left/);
    const m = addProduct({ name: 'MTO', leadTimeDays: 7, variants: [{ label: 'S', stock: 0 }] });
    const q = await quoteCart([{ variantId: variantOf(m), qty: 5 }]);
    expect(q.issues).toHaveLength(0); expect(q.dispatchBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('checkout', () => {
  it('rejects addresses outside India and bad PIN or phone', async () => {
    const p = addProduct(); const items = [{ variantId: variantOf(p), qty: 1 }];
    await expect(createOrder({ ...address, items, country: 'United States' })).rejects.toBeInstanceOf(HttpError);
    await expect(createOrder({ ...address, items, state: 'California' })).rejects.toThrow();
    await expect(createOrder({ ...address, items, pincode: '012345' })).rejects.toThrow();
    await expect(createOrder({ ...address, items, phone: '12345' })).rejects.toThrow();
    expect(getDb().prepare('SELECT COUNT(*) c FROM orders').get()).toEqual({ c: 0 });
  });
  it('splits GST as CGST/SGST in Tamil Nadu, IGST elsewhere, and totals match the quote', async () => {
    const p = addProduct({ priceInr: 500, categories: ['ceramics'] });
    const items = [{ variantId: variantOf(p), qty: 1 }];
    const tn = getOrderByToken(await tokenOf(items, { state: 'Tamil Nadu', pincode: '600001' }))!.order;
    expect(tn.igst_paise).toBe(0); expect(tn.cgst_paise).toBeGreaterThan(0);
    const ka = getOrderByToken(await tokenOf(items))!.order;
    expect(ka.cgst_paise).toBe(0); expect(ka.igst_paise).toBeGreaterThan(0);
    const q = await quoteCart(items, { state: 'Karnataka' });
    expect(ka.total_paise).toBe(q.price.totalPaise); expect(ka.total_paise).toBe(50000 + 7900);
    expect(ka.taxable_paise + ka.igst_paise).toBe(ka.total_paise);
  });
  it('decrements stock on order, and returns it on failed payment or expiry', async () => {
    const p = addProduct({ variants: [{ label: 'S', stock: 3 }] }); const v = variantOf(p);
    const stock = () => (getDb().prepare('SELECT stock FROM variants WHERE id=?').get(v) as any).stock;
    const t1 = await tokenOf([{ variantId: v, qty: 2 }]); expect(stock()).toBe(1);
    await expect(createOrder({ ...address, items: [{ variantId: v, qty: 2 }] })).rejects.toThrow(/Only 1 left|not enough/);
    markFailed(t1); expect(stock()).toBe(3);
    await tokenOf([{ variantId: v, qty: 3 }]); expect(stock()).toBe(0);
    releaseExpiredOrders(new Date(Date.now() + 3600_000)); expect(stock()).toBe(3);
  });
  it('does not decrement stock for made-to-order items', async () => {
    const p = addProduct({ leadTimeDays: 5, variants: [{ label: 'S', stock: 0 }] });
    await tokenOf([{ variantId: variantOf(p), qty: 4 }]);
    expect((getDb().prepare('SELECT stock FROM variants WHERE product_id=?').get(p) as any).stock).toBe(0);
    expect((getDb().prepare('SELECT dispatch_by FROM orders').get() as any).dispatch_by).toBeTruthy();
  });
  it('payment confirmation is idempotent and issues exactly one invoice', async () => {
    const p = addProduct(); const t = await tokenOf([{ variantId: variantOf(p), qty: 1 }]);
    expect(markPaid(t)).toBe('paid'); expect(markPaid(t)).toBe('paid');
    expect(getDb().prepare('SELECT COUNT(*) c FROM invoices').get()).toEqual({ c: 1 });
  });
});

describe('loyalty is opt-in', () => {
  it('does not enrol or award points unless the box was ticked', async () => {
    const p = addProduct({ priceInr: 1000 }); const items = [{ variantId: variantOf(p), qty: 1 }];
    markPaid(await tokenOf(items));
    expect(getDb().prepare('SELECT COUNT(*) c FROM loyalty_members').get()).toEqual({ c: 0 });
    markPaid(await tokenOf(items, { joinLoyalty: true }));
    expect((getDb().prepare('SELECT points FROM loyalty_members').get() as any).points).toBe(20);
  });
  it('redeems points as a discount and caps at the configured percentage', async () => {
    const p = addProduct({ priceInr: 1000, variants: [{ label: 'S', stock: 20 }] }); const items = [{ variantId: variantOf(p), qty: 1 }];
    getDb().prepare('INSERT INTO loyalty_members (email, name, points) VALUES (?,?,?)').run(address.email, 'Asha', 500);
    const q = await quoteCart(items, { redeemPoints: 500, email: address.email });
    expect(q.redeemedPoints).toBe(200); expect(q.price.discountPaise).toBe(20000);
  });
});
