import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrderByToken, releaseExpiredOrders } from '@/lib/orders';
import { rupees } from '@/lib/money';
import { formatDate } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your order', robots: { index: false } };
const label: Record<string, string> = { pending_payment: 'Waiting for payment', paid: 'Paid. We are preparing your order', shipped: 'Shipped', delivered: 'Delivered', payment_failed: 'Payment failed', expired: 'Expired', cancelled: 'Cancelled', needs_refund: 'Payment received after the hold expired. We will contact you about a refund' };
export default function Order({ params }: { params: { token: string } }) {
  releaseExpiredOrders();
  const d = getOrderByToken(params.token); if (!d) notFound();
  const { order: o, items } = d; const paid = ['paid', 'shipped', 'delivered'].includes(o.status);
  return (<div className="section" style={{ paddingTop: 24 }}>
    <h1>Order {o.number}</h1><p><span className={`tag ${paid ? 'ok' : o.status === 'pending_payment' ? 'warn' : 'bad'}`}>{label[o.status] ?? o.status}</span></p>
    {paid && <div className="row noprint" style={{ margin: '12px 0' }}><Link className="btn" href={`/order/${o.token}/invoice`}>View GST invoice</Link><a className="btn alt" href={`/api/orders/${o.token}/invoice`}>Download PDF</a></div>}
    {o.status === 'pending_payment' && <div className="row"><Link className="btn gold" href={`/pay/${o.token}`}>Continue to payment</Link></div>}
    {o.dispatch_by && paid && <p>Made-to-order pieces dispatch by {formatDate(o.dispatch_by)}.</p>}
    {o.awb && <p>Tracking number: <b>{o.awb}</b> {o.tracking_url && <a href={o.tracking_url} rel="noopener noreferrer">Track</a>}</p>}
    {o.points_earned > 0 && <p>You earned {o.points_earned} Studio Circle points on this order.</p>}
    <div className="scroll"><table className="t"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
      {items.map((i) => <tr key={i.id}><td>{i.name}{i.variant_label && i.variant_label !== 'Standard' ? ` (${i.variant_label})` : ''}{i.engraving ? ` [${i.engraving}]` : ''}</td><td>{i.qty}</td><td>{rupees(i.gross_paise - i.discount_paise)}</td></tr>)}
      <tr><td>Shipping</td><td></td><td>{o.shipping_paise ? rupees(o.shipping_paise) : 'Free'}</td></tr>
      <tr><th>Total (incl. GST {rupees(o.cgst_paise + o.sgst_paise + o.igst_paise)})</th><th></th><th>{rupees(o.total_paise)}</th></tr></tbody></table></div>
    <p className="note">Delivering to {o.name}, {o.ship_line1}, {o.ship_city}, {o.ship_state} {o.ship_pincode}. Keep this page link private: it gives access to your invoice.</p>
  </div>);
}
