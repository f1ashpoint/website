'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { rupees } from '@/lib/money';

export interface UpItem { id: number; slug: string; name: string; pricePaise: number; image: string | null; variantId: number | null; hasChoices: boolean }
export default function Upsell({ items, heading = 'Suggested add-on' }: { items: UpItem[]; heading?: string }) {
  const { add } = useCart(); const [hidden, setHidden] = useState(false); const [added, setAdded] = useState<number[]>([]);
  useEffect(() => { try { if (sessionStorage.getItem('csc_dismiss_upsell') === '1') setHidden(true); } catch { /* ignore */ } }, []);
  if (hidden || !items.length) return null;
  return (
    <aside className="upsell" aria-label="Suggested add-ons">
      <div className="lab">{heading}. Optional, nothing is added unless you choose.</div>
      <button className="x" aria-label="Dismiss suggestions" onClick={() => { setHidden(true); try { sessionStorage.setItem('csc_dismiss_upsell', '1'); } catch { /* ignore */ } }}>×</button>
      {items.map((u) => (
        <div className="upitem" key={u.id}>
          {u.image && <img src={u.image} alt="" />}
          <div style={{ flex: 1 }}><b>{u.name}</b><div className="note">{rupees(u.pricePaise)} incl. GST</div></div>
          {u.hasChoices || !u.variantId ? <Link className="btn sm alt" href={`/product/${u.slug}`}>Choose options</Link>
            : added.includes(u.id) ? <span className="tag ok">Added</span>
            : <button className="btn sm gold" onClick={() => { add({ variantId: u.variantId!, qty: 1 }, u.id); setAdded([...added, u.id]); }}>Add</button>}
        </div>))}
    </aside>
  );
}
