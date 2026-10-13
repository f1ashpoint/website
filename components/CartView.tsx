'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import Upsell, { type UpItem } from './Upsell';
import { rupees } from '@/lib/money';

export interface QuoteView { lines: any[]; price: any; issues: string[]; dispatchBy: string | null; addons: UpItem[]; stateKnown: boolean; intraState: boolean; redeemedPoints: number }
export function Totals({ q }: { q: QuoteView }) {
  const p = q.price;
  return (<div className="tot" aria-label="Order totals">
    <span>Items (incl. GST)</span><span>{rupees(p.itemsTotalPaise)}</span>
    {p.discountPaise > 0 && <><span>Loyalty points ({q.redeemedPoints})</span><span>−{rupees(p.discountPaise)}</span></>}
    <span>Shipping (incl. GST)</span><span>{p.shippingPaise === 0 ? 'Free' : rupees(p.shippingPaise)}</span>
    <span className="big">Total to pay</span><span className="big">{rupees(p.totalPaise)}</span>
    <span className="note">of which GST{q.stateKnown ? (q.intraState ? ' (CGST + SGST)' : ' (IGST)') : ''}</span><span className="note">{rupees(p.totalTaxPaise)}</span>
  </div>);
}
export function useQuote(extra: Record<string, unknown> = {}) {
  const { items, ready } = useCart(); const [q, setQ] = useState<QuoteView | null>(null); const [err, setErr] = useState('');
  const key = JSON.stringify([items, extra]);
  useEffect(() => {
    if (!ready) return;
    if (!items.length) { setQ(null); return; }
    let live = true;
    fetch('/api/cart/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, ...extra }) })
      .then(async (r) => { const d = await r.json(); if (!live) return; if (!r.ok) setErr(d.error || 'Could not price your cart.'); else { setErr(''); setQ(d); } })
      .catch(() => live && setErr('Could not reach the shop. Check your connection and try again.'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return { q, err };
}

export default function CartView() {
  const { items, ready, setQty, remove } = useCart(); const { q, err } = useQuote();
  if (!ready) return <p>Loading your cart…</p>;
  if (!items.length) return <div className="box"><p>Your cart is empty.</p><Link className="btn" href="/shop">Start browsing</Link></div>;
  const p = q?.price; const pct = p ? Math.min(100, Math.round((p.itemsTotalPaise / (p.itemsTotalPaise + p.amountToFreeShippingPaise || 1)) * 100)) : 0;
  return (
    <div className="cartgrid">
      <div>
        {err && <div className="err" role="alert">{err}</div>}
        {q?.lines.map((l: any) => (
          <div className="line" key={l.key}>
            {l.image ? <img src={l.image} alt="" /> : <div />}
            <div><b>{l.name}</b>{l.variantLabel && l.variantLabel !== 'Standard' && <div className="note">{l.variantLabel}</div>}{l.engraving && <div className="note">Personalised: “{l.engraving}”</div>}
              {l.madeToOrder && <div className="tag">Made to order</div>}{l.issue && <div className="err" role="alert">{l.issue}</div>}
              <div className="row" style={{ marginTop: 8 }}>
                <div className="qty" role="group" aria-label={`Quantity for ${l.name}`}><button aria-label="Decrease" onClick={() => setQty(l.variantId, l.engraving || undefined, l.qty - 1)}>−</button><span>{l.qty}</span><button aria-label="Increase" onClick={() => setQty(l.variantId, l.engraving || undefined, Math.min(l.maxQty || 1, l.qty + 1))}>+</button></div>
                <button className="btn sm alt" onClick={() => remove(l.variantId, l.engraving || undefined)}>Remove</button></div></div>
            <b>{rupees(l.unitPaise * l.qty)}</b>
          </div>))}
        {q && <div style={{ marginTop: 18 }}><Upsell items={q.addons} heading="Suggested add-ons" /></div>}
      </div>
      <aside className="box stack" aria-label="Order summary">
        <h2 style={{ fontSize: '1.4rem' }}>Order summary</h2>
        {q && p ? (<>
          {p.freeShipping ? <div className="okmsg">You have free shipping.</div> : <div><div className="note">Add {rupees(p.amountToFreeShippingPaise)} more for free shipping</div><div className="bar-prog"><i style={{ width: pct + '%' }} /></div></div>}
          <Totals q={q} />
          {q.dispatchBy && <p className="note">Your made-to-order pieces dispatch by {new Date(q.dispatchBy + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} if you order today.</p>}
          <Link className="btn gold" href="/checkout" aria-disabled={q.issues.length > 0} onClick={(e) => q.issues.length && e.preventDefault()}>Go to checkout</Link>
          <p className="note">GST rate for each item is shown on its page. Delivery within India only.</p>
        </>) : <p>Calculating…</p>}
      </aside>
    </div>
  );
}
