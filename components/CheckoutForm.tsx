'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { useQuote, Totals } from './CartView';
import { INDIAN_STATES } from '@/lib/states';

export default function CheckoutForm({ originState }: { originState: string }) {
  const { items, ready, clear } = useCart();
  const [f, setF] = useState({ name: '', email: '', phone: '', line1: '', line2: '', city: '', state: originState, pincode: '', country: 'India' });
  const [join, setJoin] = useState(false); const [redeem, setRedeem] = useState(0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [fields, setFields] = useState<Record<string, string>>({});
  const { q, err: qerr } = useQuote({ state: f.state, pincode: f.pincode.length === 6 ? f.pincode : undefined, redeemPoints: redeem || undefined, email: /\S+@\S+\.\S+/.test(f.email) ? f.email : undefined });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  if (!ready) return <p>Loading…</p>;
  if (!items.length) return <div className="box"><p>Your cart is empty.</p><Link className="btn" href="/shop">Browse the shop</Link></div>;
  const outside = f.country.trim().toLowerCase() !== 'india';

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setFields({});
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, items, joinLoyalty: join, redeemPoints: redeem }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'We could not place your order.'); setFields(d.fields || {}); setBusy(false); return; }
      clear(); window.location.href = d.redirect;
    } catch { setErr('Could not reach the shop. Please check your connection and try again.'); setBusy(false); }
  }
  const F = ({ k, label, type = 'text', auto, full, hint }: { k: keyof typeof f; label: string; type?: string; auto?: string; full?: boolean; hint?: string }) => (
    <label className={`field${full ? ' full' : ''}`}>{label}<input type={type} value={f[k]} onChange={set(k)} autoComplete={auto} required={k !== 'line2'} aria-invalid={!!fields[k]} inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined} />{hint && <span className="note">{hint}</span>}{fields[k] && <small role="alert">{fields[k]}</small>}</label>);
  return (
    <form onSubmit={submit} className="cartgrid" noValidate={false}>
      <div className="stack">
        <h2>Delivery details</h2>
        <div className="form">
          <F k="name" label="Full name" auto="name" /><F k="phone" label="Mobile number" type="tel" auto="tel" hint="10 digits, we only use it for delivery updates" />
          <F k="email" label="Email" type="email" auto="email" full hint="Your invoice link is sent here" />
          <F k="line1" label="Address" auto="address-line1" full /><F k="line2" label="Apartment, landmark (optional)" auto="address-line2" full />
          <F k="city" label="City" auto="address-level2" />
          <label className="field">State or union territory<select value={f.state} onChange={set('state')} autoComplete="address-level1">{INDIAN_STATES.map((s) => <option key={s.code}>{s.name}</option>)}</select>{fields.state && <small>{fields.state}</small>}</label>
          <F k="pincode" label="PIN code" auto="postal-code" />
          <label className="field">Country<input value={f.country} onChange={set('country')} autoComplete="country-name" aria-invalid={outside || !!fields.country} />{(outside || fields.country) && <small role="alert">We currently deliver within India only.</small>}</label>
        </div>
        <div className="box stack">
          <label className="chk field" style={{ flexDirection: 'row' }}><input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} />
            <span>Join Studio Circle (optional)<br /><span className="note" style={{ fontWeight: 400 }}>Members earn points on every paid order and can use them as a discount on later orders. We use your email only to track your points. <Link href="/loyalty">Full details</Link></span></span></label>
          <label className="field">Use loyalty points (optional)<input type="number" min={0} value={redeem || ''} onChange={(e) => setRedeem(Math.max(0, Number(e.target.value) || 0))} placeholder="0" style={{ maxWidth: 160 }} /><span className="note">Only for existing members. Needs your email above. {fields.redeemPoints}</span></label>
        </div>
      </div>
      <aside className="box stack" aria-label="Order summary">
        <h2 style={{ fontSize: '1.4rem' }}>Your order</h2>
        {q ? (<>
          {q.lines.map((l: any) => <div className="row" key={l.key} style={{ justifyContent: 'space-between' }}><span>{l.name}{l.variantLabel && l.variantLabel !== 'Standard' ? ` (${l.variantLabel})` : ''} × {l.qty}</span></div>)}
          <Totals q={q} />
          {q.dispatchBy && <p className="note">Made-to-order pieces dispatch by {new Date(q.dispatchBy + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>}
        </>) : <p>Calculating…</p>}
        {(qerr || err) && <div className="err" role="alert">{err || qerr}</div>}
        {q?.issues.map((i) => <div className="err" key={i} role="alert">{i}</div>)}
        <p className="note">The total above is final. No add-ons are included unless you added them. A GST invoice is issued once payment is confirmed.</p>
        <button className="btn gold" type="submit" disabled={busy || outside || !q || q.issues.length > 0}>{busy ? 'Placing order…' : 'Continue to payment'}</button>
        <p className="note">Stock is held for you while you pay, then released if payment is not completed.</p>
      </aside>
    </form>
  );
}
