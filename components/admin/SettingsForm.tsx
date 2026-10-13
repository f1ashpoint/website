'use client';
import { useState } from 'react';
export default function SettingsForm({ initial, categories }: { initial: any; categories: { slug: string; name: string }[] }) {
  const [f, setF] = useState(initial); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); const d = await r.json();
    if (r.ok) setMsg('Saved. New rates apply to new orders immediately.'); else setErr(d.error + ' ' + Object.values(d.fields || {}).join(' '));
  }
  const n = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (<form className="stack" onSubmit={save}><h1>Shipping and GST</h1>
    <p className="note">Defaults are starting points from public information. Check every figure against your courier contract and with your CA before launch.</p>
    {msg && <div className="okmsg" role="status">{msg}</div>}{err && <div className="err" role="alert">{err}</div>}
    <div className="form"><label className="field">Flat shipping charge (₹, incl. GST)<input type="number" min={0} step="0.01" value={f.shippingFlatInr} onChange={n('shippingFlatInr')} /></label>
      <label className="field">Free shipping from order value (₹)<input type="number" min={0} value={f.freeShippingThresholdInr} onChange={n('freeShippingThresholdInr')} /></label>
      <label className="field">GST rate on shipping (%)<input type="number" min={0} max={40} step="0.5" value={f.shippingGstRate} onChange={n('shippingGstRate')} /></label>
      <label className="field">Low-stock warning at (units)<input type="number" min={0} value={f.lowStockThreshold} onChange={n('lowStockThreshold')} /></label>
      <label className="field">Loyalty: 1 point per ₹ spent<input type="number" min={1} value={f.loyaltyEarnPerRupees} onChange={n('loyaltyEarnPerRupees')} /></label>
      <label className="field">Loyalty: max % of order payable with points<input type="number" min={0} max={100} value={f.loyaltyMaxRedeemPct} onChange={n('loyaltyMaxRedeemPct')} /></label></div>
    <fieldset className="box"><legend>Default GST rate by category (%)</legend><div className="form">{categories.map((c) => <label className="field" key={c.slug}>{c.name}<input type="number" min={0} max={40} step="0.5" value={f.categoryGst[c.slug] ?? ''} onChange={(e) => setF({ ...f, categoryGst: { ...f.categoryGst, [c.slug]: e.target.value } })} /></label>)}</div></fieldset>
    <button className="btn">Save settings</button></form>);
}
