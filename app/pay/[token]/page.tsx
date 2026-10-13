import { notFound } from 'next/navigation';
import PayButtons from '@/components/PayButtons';
import { getOrderByToken, releaseExpiredOrders } from '@/lib/orders';
import { rupees } from '@/lib/money';
import { getPaymentProvider } from '@/lib/providers/payment';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment', robots: { index: false } };
export default function Pay({ params }: { params: { token: string } }) {
  const prov = getPaymentProvider(); // throws in production unless a real provider (or ALLOW_STUB_PAYMENTS=1) is configured
  if (prov.id !== 'stub') notFound();
  releaseExpiredOrders();
  const d = getOrderByToken(params.token); if (!d) notFound();
  const o = d.order;
  return (<div className="section" style={{ maxWidth: 560 }}><h1>Sandbox payment</h1>
    <div className="err">This is a test payment page. No money moves and no card is charged. Replace the stub provider with a real gateway before launch.</div>
    {o.status !== 'pending_payment' ? <div className="box"><p>This order is {o.status.replace(/_/g, ' ')}.</p><a className="btn" href={`/order/${o.token}`}>View order</a></div>
      : <div className="box stack"><p>Order {o.number}</p><p className="price" style={{ fontSize: '1.6rem' }}>{rupees(o.total_paise)} INR</p><PayButtons token={o.token} /></div>}
  </div>);
}
