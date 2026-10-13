import { getDb } from '../../../../lib/db';
import { rupees } from '../../../../lib/money';
import OrderActions from '../../../../components/admin/OrderActions';
import { releaseExpiredOrders } from '../../../../lib/orders';
export const dynamic = 'force-dynamic';
export default function Orders() {
  releaseExpiredOrders();
  const rows = getDb().prepare(`SELECT o.*, (SELECT number FROM invoices WHERE order_id=o.id) inv, (SELECT group_concat(name || ' x' || qty, ', ') FROM order_items WHERE order_id=o.id) items FROM orders o ORDER BY o.id DESC LIMIT 200`).all() as any[];
  return (<div><h1>Orders</h1><div className="scroll"><table className="t"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Invoice</th><th>Fulfilment</th></tr></thead><tbody>
    {rows.map((o) => <tr key={o.id}><td>{o.number}</td><td>{o.created_at}</td><td>{o.name}<br /><small>{o.email}, {o.phone}<br />{o.ship_city}, {o.ship_state} {o.ship_pincode}</small></td><td>{o.items}{o.dispatch_by && <div><small>Dispatch by {o.dispatch_by}</small></div>}</td><td>{rupees(o.total_paise)}</td><td>{o.status.replace(/_/g, ' ')}</td>
      <td>{o.inv ? <a href={`/api/orders/${o.token}/invoice`}>{o.inv}</a> : '-'}</td><td><OrderActions id={o.id} status={o.status} awb={o.awb} /></td></tr>)}
    {!rows.length && <tr><td colSpan={8}>No orders yet.</td></tr>}</tbody></table></div></div>);
}
