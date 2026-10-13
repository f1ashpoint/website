import { describe, it, expect, beforeEach } from 'vitest';
import { freshDb, addProduct, variantOf, address } from './helpers';
import { getDb } from '@/lib/db';
import { createOrder, markPaid } from '@/lib/orders';
import { issueInvoice, getInvoiceView, renderInvoicePdf } from '@/lib/invoice';
import { GET as invoiceRoute } from '@/app/api/orders/[token]/invoice/route';

beforeEach(() => { freshDb(); });
const paidOrder = async (over: any = {}) => {
  const p = addProduct({ priceInr: 1050, hsn: '6912', categories: ['ceramics'] });
  const o = await createOrder({ ...address, items: [{ variantId: variantOf(p), qty: 2 }], ...over });
  const token = (getDb().prepare('SELECT token FROM orders WHERE number=?').get(o.number) as any).token; markPaid(token); return token as string;
};
describe('GST invoice', () => {
  it('is not available before payment, then numbered sequentially per financial year', async () => {
    const p = addProduct(); await createOrder({ ...address, items: [{ variantId: variantOf(p), qty: 1 }] });
    const t0 = (getDb().prepare('SELECT token FROM orders').get() as any).token; expect(getInvoiceView(t0)).toBeNull();
    const t1 = await paidOrder(); const t2 = await paidOrder();
    const n1 = getInvoiceView(t1)!.invoice.number, n2 = getInvoiceView(t2)!.invoice.number;
    expect(n1).toMatch(/^CSC\/\d{4}-\d{2}\/000001$/); expect(n2).toMatch(/\/000002$/);
  });
  it('rolls over on 1 April and is idempotent', async () => {
    const t = await paidOrder(); const oid = (getDb().prepare('SELECT id FROM orders WHERE token=?').get(t) as any).id;
    expect(issueInvoice(oid)).toBe(getInvoiceView(t)!.invoice.number);
    const p = addProduct({ name: 'Other' }); const o = await createOrder({ ...address, items: [{ variantId: variantOf(p), qty: 1 }] });
    const id2 = (getDb().prepare('SELECT id FROM orders WHERE number=?').get(o.number) as any).id;
    expect(issueInvoice(id2, new Date('2027-04-02T00:00:00+05:30'))).toBe('CSC/2027-28/000001');
    const id3 = id2 + 1000; getDb().prepare('INSERT INTO orders (id,token,number,email,phone,name,ship_line1,ship_city,ship_state,ship_pincode,items_total_paise,shipping_paise,total_paise,taxable_paise,cgst_paise,sgst_paise,igst_paise) VALUES (?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0)').run(id3, 'tk', 'n', 'a@b.c', '9', 'n', 'l', 'c', 'Tamil Nadu', '600001');
    expect(issueInvoice(id3, new Date('2027-03-31T10:00:00+05:30'))).toBe('CSC/2026-27/000002');
  });
  it('contains seller GSTIN, HSN, place of supply and tax split, and totals reconcile', async () => {
    const t = await paidOrder({ state: 'Tamil Nadu', pincode: '600001' }); const v = getInvoiceView(t)!;
    expect(v.seller.gstin).toBe('33ABCDE1234F1Z5'); expect(v.placeOfSupply).toBe('Tamil Nadu'); expect(v.placeCode).toBe('33');
    expect(v.items[0].hsn).toBe('6912'); expect(v.order.igst_paise).toBe(0);
    expect(v.order.taxable_paise + v.order.cgst_paise + v.order.sgst_paise).toBe(v.order.total_paise);
  });
  it('renders a PDF and serves it to the customer by secret link', async () => {
    const t = await paidOrder(); const pdf = await renderInvoicePdf(getInvoiceView(t)!);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); expect(pdf.length).toBeGreaterThan(1500);
    const res = await invoiceRoute(new Request('http://x'), { params: { token: t } });
    expect(res.status).toBe(200); expect(res.headers.get('content-type')).toBe('application/pdf'); expect(res.headers.get('content-disposition')).toContain('attachment');
    expect((await invoiceRoute(new Request('http://x'), { params: { token: 'nope' } })).status).toBe(404);
  });
});
