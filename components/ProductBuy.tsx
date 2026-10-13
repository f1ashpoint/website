'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { rupees } from '@/lib/money';

interface V { id: number; label: string; pricePaise: number; stock: number }
export default function ProductBuy(p: { productId: number; variants: V[]; madeToOrder: boolean; lowStock: number; engraving: { enabled: boolean; max: number; feePaise: number }; dispatchBy: string | null }) {
  const first = p.variants.find((v) => p.madeToOrder || v.stock > 0) ?? p.variants[0];
  const [vid, setVid] = useState(first.id); const [qty, setQty] = useState(1); const [eng, setEng] = useState(''); const [done, setDone] = useState(false);
  const { add } = useCart(); const v = p.variants.find((x) => x.id === vid)!;
  const avail = p.madeToOrder || v.stock > 0; const max = p.madeToOrder ? 50 : v.stock;
  const unit = v.pricePaise + (eng.trim() ? p.engraving.feePaise : 0);
  return (
    <div className="stack">
      {p.variants.length > 1 && <div><div id="vl" className="note"><b>Option:</b> {v.label}</div>
        <div className="opts" role="radiogroup" aria-labelledby="vl">{p.variants.map((x) => { const out = !p.madeToOrder && x.stock <= 0;
          return <button key={x.id} type="button" role="radio" aria-checked={x.id === vid} disabled={out} className="opt" onClick={() => { setVid(x.id); setQty(1); setDone(false); }}>{x.label}{out ? ' (sold out)' : ''}</button>; })}</div></div>}
      {p.engraving.enabled && <label className="field">Personalise (optional, up to {p.engraving.max} characters{p.engraving.feePaise ? `, adds ${rupees(p.engraving.feePaise)}` : ''})
        <input value={eng} maxLength={p.engraving.max} onChange={(e) => setEng(e.target.value)} placeholder="Name or initials" /></label>}
      <div className="row"><span className="price" style={{ fontSize: '1.6rem' }}>{rupees(unit)}</span><span className="note">inclusive of GST</span></div>
      {!p.madeToOrder && v.stock > 0 && v.stock <= p.lowStock && <span className="tag warn">Only {v.stock} left in this option</span>}
      {!p.madeToOrder && v.stock <= 0 && <span className="tag bad">This option is sold out</span>}
      {p.madeToOrder && p.dispatchBy && <p className="note"><b>Made to order.</b> If you order today, we dispatch by {p.dispatchBy}.</p>}
      <div className="row">
        <div className="qty" role="group" aria-label="Quantity"><button type="button" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span aria-live="polite">{qty}</span><button type="button" aria-label="Increase" onClick={() => setQty(Math.min(max, qty + 1))}>+</button></div>
        <button className="btn" disabled={!avail} onClick={() => { add({ variantId: vid, qty, engraving: eng.trim() || undefined }, p.productId); setDone(true); }}>Add to cart</button>
      </div>
      {done && <div className="okmsg" role="status">Added. <Link href="/cart">View cart</Link></div>}
    </div>
  );
}
