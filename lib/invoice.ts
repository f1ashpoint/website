import PDFDocument from 'pdfkit';
import { getDb } from './db';
import { stateCode, store, getSettings } from './config';
import { amountInWords } from './money';
type Row = Record<string, any>;

const fyOf = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(d);
  const y = +p.find((x) => x.type === 'year')!.value, m = +p.find((x) => x.type === 'month')!.value;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/** Idempotent. Call inside the payment-confirmation transaction. Numbers are sequential per financial year (April to March). */
export function issueInvoice(orderId: number, now = new Date()): string {
  const db = getDb();
  const existing = db.prepare('SELECT number FROM invoices WHERE order_id=?').get(orderId) as { number: string } | undefined;
  if (existing) return existing.number;
  const fy = fyOf(now);
  db.prepare('INSERT INTO invoice_counters (fy, last) VALUES (?, 0) ON CONFLICT(fy) DO NOTHING').run(fy);
  db.prepare('UPDATE invoice_counters SET last = last + 1 WHERE fy=?').run(fy);
  const n = (db.prepare('SELECT last FROM invoice_counters WHERE fy=?').get(fy) as { last: number }).last;
  const number = `CSC/${fy}/${String(n).padStart(6, '0')}`;
  db.prepare('INSERT INTO invoices (order_id, number, issued_at, seller_json) VALUES (?,?,?,?)').run(orderId, number, now.toISOString(), JSON.stringify(store()));
  return number;
}

export function getInvoiceView(token: string) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM orders WHERE token=?').get(token) as Row | undefined;
  if (!o) return null;
  const inv = db.prepare('SELECT * FROM invoices WHERE order_id=?').get(o.id) as Row | undefined;
  if (!inv) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY id').all(o.id) as Row[];
  const seller = JSON.parse(inv.seller_json) as ReturnType<typeof store>;
  const s = getSettings();
  return { invoice: { number: inv.number as string, issuedAt: inv.issued_at as string }, order: o, items, seller,
    originState: s.originState, sellerStateCode: stateCode(s.originState), placeOfSupply: o.ship_state as string, placeCode: stateCode(o.ship_state) };
}
export type InvoiceView = NonNullable<ReturnType<typeof getInvoiceView>>;

const inr = (p: number) => 'Rs. ' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function renderInvoicePdf(v: InvoiceView): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36, info: { Title: `Tax Invoice ${v.invoice.number}`, Author: v.seller.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const o = v.order; const W = 523;
    doc.font('Helvetica-Bold').fontSize(18).text('TAX INVOICE', 36, 36);
    doc.font('Helvetica').fontSize(9).fillColor('#444').text('Original for recipient', 36, 58);
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text(v.seller.name, 330, 36, { width: 229, align: 'right' });
    doc.font('Helvetica').fontSize(8.5).text(v.seller.address, 330, 51, { width: 229, align: 'right' });
    doc.text(`GSTIN: ${v.seller.gstin || 'Not provided'}`, 330, doc.y + 2, { width: 229, align: 'right' });
    if (v.seller.pan) doc.text(`PAN: ${v.seller.pan}`, { width: 229, align: 'right' });
    doc.text(`State: ${v.originState} (${v.sellerStateCode})`, { width: 229, align: 'right' });
    let y = 112;
    doc.moveTo(36, y).lineTo(36 + W, y).strokeColor('#999').stroke(); y += 8;
    const dt = new Date(v.invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    doc.font('Helvetica-Bold').fontSize(9).text('Invoice no.', 36, y).text('Invoice date', 36, y + 13).text('Order no.', 36, y + 26);
    doc.font('Helvetica').text(v.invoice.number, 110, y).text(dt, 110, y + 13).text(o.number, 110, y + 26);
    doc.font('Helvetica-Bold').text('Bill to / Ship to', 330, y);
    doc.font('Helvetica').text(`${o.name}\n${o.ship_line1}${o.ship_line2 ? ', ' + o.ship_line2 : ''}\n${o.ship_city}, ${o.ship_state} ${o.ship_pincode}\nPhone: ${o.phone}`, 330, y + 13, { width: 229 });
    doc.text(`Place of supply: ${v.placeOfSupply} (${v.placeCode})`, 36, y + 46);
    y += 92;
    const cols = [{ t: 'Item', w: 150 }, { t: 'HSN', w: 44 }, { t: 'Qty', w: 28 }, { t: 'Taxable', w: 62 }, { t: 'GST%', w: 32 }, { t: 'CGST', w: 50 }, { t: 'SGST', w: 50 }, { t: 'IGST', w: 50 }, { t: 'Amount', w: 57 }];
    const row = (cells: string[], bold = false, yy = y) => {
      let x = 36; doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      const h = Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: cols[i].w - 4 }))) + 6;
      cells.forEach((c, i) => { doc.text(c, x, yy + 3, { width: cols[i].w - 4, align: i === 0 ? 'left' : 'right' }); x += cols[i].w; });
      doc.moveTo(36, yy + h).lineTo(36 + W, yy + h).strokeColor('#ddd').stroke();
      return h;
    };
    doc.rect(36, y - 2, W, 18).fill('#eee').fillColor('#000'); y += row(cols.map((c) => c.t), true) - 1;
    for (const it of v.items) {
      const name = it.name + (it.variant_label && it.variant_label !== 'Standard' ? ` (${it.variant_label})` : '') + (it.engraving ? ` [Engraving: ${it.engraving}]` : '');
      y += row([name, it.hsn || '-', String(it.qty), inr(it.taxable_paise), String(it.gst_rate), inr(it.cgst_paise), inr(it.sgst_paise), inr(it.igst_paise), inr(it.gross_paise - it.discount_paise)]);
    }
    const sc = o.shipping_tax_paise ? (o.intra_state ? Math.floor(o.shipping_tax_paise / 2) : 0) : 0;
    const ss = o.intra_state ? o.shipping_tax_paise - sc : 0; const si = o.intra_state ? 0 : o.shipping_tax_paise;
    y += row(['Shipping and handling', '9965', '1', inr(o.shipping_taxable_paise), String(o.shipping_gst_rate), inr(sc), inr(ss), inr(si), inr(o.shipping_paise)]);
    y += 10; doc.font('Helvetica').fontSize(9);
    const line = (label: string, val: string, bold = false) => { doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 330, y, { width: 130 }).text(val, 460, y, { width: 99, align: 'right' }); y += 14; };
    line('Total taxable value', inr(o.taxable_paise));
    if (o.intra_state) { line('CGST', inr(o.cgst_paise)); line('SGST', inr(o.sgst_paise)); } else line('IGST', inr(o.igst_paise));
    if (o.discount_paise) line('Loyalty points discount (already applied above)', inr(o.discount_paise));
    line('Invoice total (incl. GST)', inr(o.total_paise), true);
    y += 6; doc.font('Helvetica-Bold').fontSize(9).text('Amount in words: ', 36, y, { continued: true }).font('Helvetica').text(amountInWords(o.total_paise), { width: W });
    y = doc.y + 14;
    doc.font('Helvetica').fontSize(8).fillColor('#444').text('Prices are inclusive of GST. This is a computer-generated invoice and does not need a signature. Goods are of Indian origin. Payment received in INR.', 36, y, { width: W });
    doc.end();
  });
}
