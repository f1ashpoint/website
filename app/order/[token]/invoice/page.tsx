import { notFound } from 'next/navigation';
import { getInvoiceView } from '@/lib/invoice';
import { rupees, amountInWords } from '@/lib/money';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'GST invoice', robots: { index: false } };
export default function InvoicePage({ params }: { params: { token: string } }) {
  const v = getInvoiceView(params.token); if (!v) notFound();
  const o = v.order; const intra = !!o.intra_state;
  const sc = intra ? Math.floor(o.shipping_tax_paise / 2) : 0, ss = intra ? o.shipping_tax_paise - sc : 0, si = intra ? 0 : o.shipping_tax_paise;
  return (<div className="section"><div className="row noprint"><a className="btn" href={`/api/orders/${o.token}/invoice`}>Download PDF</a><a className="btn alt" href={`/order/${o.token}`}>Back to order</a></div>
    <div className="inv">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
        <div><h1 style={{ fontSize: '1.8rem' }}>Tax invoice</h1><p>Invoice no. <b>{v.invoice.number}</b><br />Date: {new Date(v.invoice.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}<br />Order no. {o.number}</p></div>
        <div style={{ textAlign: 'right' }}><b>{v.seller.name}</b><br />{v.seller.address}<br />GSTIN: {v.seller.gstin || 'Not provided'}{v.seller.pan && <><br />PAN: {v.seller.pan}</>}<br />State: {v.originState} ({v.sellerStateCode})</div>
      </div>
      <p><b>Bill to / ship to:</b> {o.name}, {o.ship_line1}{o.ship_line2 ? ', ' + o.ship_line2 : ''}, {o.ship_city}, {o.ship_state} {o.ship_pincode}. Phone {o.phone}<br /><b>Place of supply:</b> {v.placeOfSupply} ({v.placeCode})</p>
      <div className="scroll"><table className="t"><thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Taxable</th><th>GST %</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Amount</th></tr></thead><tbody>
        {v.items.map((i) => <tr key={i.id}><td>{i.name}{i.variant_label && i.variant_label !== 'Standard' ? ` (${i.variant_label})` : ''}{i.engraving ? ` [Engraving: ${i.engraving}]` : ''}</td><td>{i.hsn || '-'}</td><td>{i.qty}</td><td>{rupees(i.taxable_paise)}</td><td>{i.gst_rate}</td><td>{rupees(i.cgst_paise)}</td><td>{rupees(i.sgst_paise)}</td><td>{rupees(i.igst_paise)}</td><td>{rupees(i.gross_paise - i.discount_paise)}</td></tr>)}
        <tr><td>Shipping and handling</td><td>9965</td><td>1</td><td>{rupees(o.shipping_taxable_paise)}</td><td>{o.shipping_gst_rate}</td><td>{rupees(sc)}</td><td>{rupees(ss)}</td><td>{rupees(si)}</td><td>{rupees(o.shipping_paise)}</td></tr>
        <tr><th colSpan={3}>Totals</th><th>{rupees(o.taxable_paise)}</th><th></th><th>{rupees(o.cgst_paise)}</th><th>{rupees(o.sgst_paise)}</th><th>{rupees(o.igst_paise)}</th><th>{rupees(o.total_paise)}</th></tr></tbody></table></div>
      <p style={{ marginTop: 12 }}><b>Amount in words:</b> {amountInWords(o.total_paise)}</p>
      <p className="note">Prices are inclusive of GST. Payment received in INR. Goods are of Indian origin. This is a computer-generated invoice.</p>
    </div></div>);
}
