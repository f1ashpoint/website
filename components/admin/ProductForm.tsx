'use client';
import { useState } from 'react';

interface V { id?: number; label: string; sku: string; priceInr: string; stock: string }
export interface FormData { id?: number; name: string; description: string; priceInr: string; categories: string[]; gstRate: string; hsn: string; leadTimeDays: string; featured: boolean;
  engraving: { enabled: boolean; max: string; feeInr: string }; variants: V[]; images: { url: string; alt: string }[]; addonIds: number[] }
export const blankForm: FormData = { name: '', description: '', priceInr: '', categories: [], gstRate: '', hsn: '', leadTimeDays: '', featured: false, engraving: { enabled: false, max: '20', feeInr: '0' }, variants: [{ label: 'Standard', sku: '', priceInr: '', stock: '0' }], images: [], addonIds: [] };

export default function ProductForm({ initial, categories, others, defaultGst }: { initial: FormData; categories: { slug: string; name: string }[]; others: { id: number; name: string }[]; defaultGst: Record<string, number> }) {
  const [f, setF] = useState<FormData>(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [fields, setFields] = useState<Record<string, string>>({}); const [up, setUp] = useState('');
  const upd = (p: Partial<FormData>) => setF({ ...f, ...p });
  const setV = (i: number, p: Partial<V>) => upd({ variants: f.variants.map((v, k) => (k === i ? { ...v, ...p } : v)) });
  const suggestedGst = f.categories[0] ? defaultGst[f.categories[0]] : undefined;
  async function upload(file: File) {
    setUp('Uploading…'); const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd }); const d = await r.json();
    if (r.ok) { upd({ images: [...f.images, { url: d.url, alt: '' }] }); setUp(''); } else setUp(d.error || 'Upload failed');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setFields({});
    const body = { name: f.name, description: f.description, priceInr: f.priceInr, categories: f.categories, gstRate: f.gstRate === '' ? null : f.gstRate, hsn: f.hsn, leadTimeDays: f.leadTimeDays === '' ? null : f.leadTimeDays, featured: f.featured,
      engraving: { enabled: f.engraving.enabled, max: f.engraving.max, feeInr: f.engraving.feeInr }, addonIds: f.addonIds, images: f.images,
      variants: f.variants.map((v) => ({ id: v.id, label: v.label, sku: v.sku, priceInr: v.priceInr === '' ? null : v.priceInr, stock: v.stock })) };
    const r = await fetch(f.id ? `/api/admin/products/${f.id}` : '/api/admin/products', { method: f.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.ok) window.location.href = '/admin/products'; else { setErr(d.error || 'Could not save.'); setFields(d.fields || {}); setBusy(false); window.scrollTo(0, 0); }
  }
  const E = ({ k }: { k: string }) => (fields[k] ? <small role="alert">{fields[k]}</small> : null);
  return (
    <form className="stack" onSubmit={save}>
      <h1>{f.id ? 'Edit product' : 'Add product'}</h1>
      {err && <div className="err" role="alert">{err}{Object.entries(fields).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</div>}
      <label className="field">Name<input value={f.name} onChange={(e) => upd({ name: e.target.value })} required /><E k="name" /></label>
      <label className="field">Description<textarea value={f.description} onChange={(e) => upd({ description: e.target.value })} /></label>
      <fieldset className="box"><legend>Categories (one or more)</legend><E k="categories" />
        {categories.map((c) => <label key={c.slug} className="chk field" style={{ flexDirection: 'row' }}><input type="checkbox" checked={f.categories.includes(c.slug)} onChange={(e) => upd({ categories: e.target.checked ? [...f.categories, c.slug] : f.categories.filter((x) => x !== c.slug) })} />{c.name}</label>)}</fieldset>
      <div className="form">
        <label className="field">Base price in ₹ (including GST)<input type="number" min={0} step="0.01" value={f.priceInr} onChange={(e) => upd({ priceInr: e.target.value })} required /><E k="priceInr" /></label>
        <label className="field">GST rate % (leave blank to use category default{suggestedGst !== undefined ? `: ${suggestedGst}%` : ''})<input type="number" min={0} max={40} step="0.5" value={f.gstRate} onChange={(e) => upd({ gstRate: e.target.value })} /></label>
        <label className="field">HSN code<input value={f.hsn} onChange={(e) => upd({ hsn: e.target.value })} maxLength={10} /></label>
        <label className="field">Made-to-order lead time in days (blank for ready stock)<input type="number" min={0} max={120} value={f.leadTimeDays} onChange={(e) => upd({ leadTimeDays: e.target.value })} /><span className="note">Customers see a dispatch date calculated from this. Stock counts are ignored for made-to-order items.</span></label>
      </div>
      <label className="chk field" style={{ flexDirection: 'row' }}><input type="checkbox" checked={f.featured} onChange={(e) => upd({ featured: e.target.checked })} />Show on the home page as a studio favourite</label>
      <fieldset className="box stack"><legend>Variants and stock</legend><E k="variants" />
        {f.variants.map((v, i) => (<div className="form" key={i} style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
          <label className="field">Label<input value={v.label} onChange={(e) => setV(i, { label: e.target.value })} required /></label>
          <label className="field">SKU<input value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} /></label>
          <label className="field">Price ₹ (blank = base)<input type="number" min={0} step="0.01" value={v.priceInr} onChange={(e) => setV(i, { priceInr: e.target.value })} /></label>
          <label className="field">Stock<input type="number" min={0} value={v.stock} onChange={(e) => setV(i, { stock: e.target.value })} required /></label>
          <button type="button" className="btn sm alt" disabled={f.variants.length < 2} onClick={() => upd({ variants: f.variants.filter((_, k) => k !== i) })}>Remove</button></div>))}
        <button type="button" className="btn sm alt" onClick={() => upd({ variants: [...f.variants, { label: '', sku: '', priceInr: '', stock: '0' }] })}>Add variant</button></fieldset>
      <fieldset className="box stack"><legend>Engraving or personalisation</legend>
        <label className="chk field" style={{ flexDirection: 'row' }}><input type="checkbox" checked={f.engraving.enabled} onChange={(e) => upd({ engraving: { ...f.engraving, enabled: e.target.checked } })} />Customers can add a short custom text</label>
        {f.engraving.enabled && <div className="row"><label className="field">Max characters<input type="number" min={1} max={60} value={f.engraving.max} onChange={(e) => upd({ engraving: { ...f.engraving, max: e.target.value } })} /></label><label className="field">Extra fee ₹<input type="number" min={0} value={f.engraving.feeInr} onChange={(e) => upd({ engraving: { ...f.engraving, feeInr: e.target.value } })} /></label></div>}</fieldset>
      <fieldset className="box stack"><legend>Images</legend><E k="images" />
        <div className="row">{f.images.map((im, i) => (<div key={i} className="stack" style={{ width: 150 }}><img src={im.url} alt="" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 10 }} />
          <input value={im.alt} placeholder="Describe the image" aria-label="Image description" onChange={(e) => upd({ images: f.images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)) })} />
          <button type="button" className="btn sm alt" onClick={() => upd({ images: f.images.filter((_, k) => k !== i) })}>Remove</button></div>))}</div>
        <label className="field">Upload image (PNG, JPEG or WebP, up to 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>{up && <p className="note">{up}</p>}</fieldset>
      <fieldset className="box"><legend>Suggested add-ons (shown as optional suggestions, never pre-selected)</legend>
        {others.filter((o) => o.id !== f.id).map((o) => <label key={o.id} className="chk field" style={{ flexDirection: 'row' }}><input type="checkbox" checked={f.addonIds.includes(o.id)} onChange={(e) => upd({ addonIds: e.target.checked ? [...f.addonIds, o.id].slice(0, 6) : f.addonIds.filter((x) => x !== o.id) })} />{o.name}</label>)}</fieldset>
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button><a className="btn alt" href="/admin/products">Cancel</a></div>
    </form>
  );
}
