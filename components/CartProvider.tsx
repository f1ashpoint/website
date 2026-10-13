'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface Item { variantId: number; qty: number; engraving?: string }
interface Ctx { items: Item[]; count: number; ready: boolean; add: (i: Item, productId?: number) => void; setQty: (v: number, e: string | undefined, q: number) => void; remove: (v: number, e: string | undefined) => void; clear: () => void }
const C = createContext<Ctx>(null as unknown as Ctx);
const KEY = 'csc_cart_v1';
export const useCart = () => useContext(C);

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]); const [ready, setReady] = useState(false);
  useEffect(() => { try { const r = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(r)) setItems(r); } catch { /* corrupt storage: start empty */ } setReady(true); }, []);
  const save = useCallback((n: Item[]) => { setItems(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* storage unavailable */ } }, []);
  const same = (a: Item, v: number, e?: string) => a.variantId === v && (a.engraving || '') === (e || '');
  const add = (i: Item, productId?: number) => {
    const ex = items.find((x) => same(x, i.variantId, i.engraving));
    save(ex ? items.map((x) => (x === ex ? { ...x, qty: Math.min(50, x.qty + i.qty) } : x)) : [...items, i]);
    if (productId) fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, type: 'cart' }) }).catch(() => {});
  };
  const setQty = (v: number, e: string | undefined, q: number) => save(items.map((x) => (same(x, v, e) ? { ...x, qty: Math.max(1, Math.min(50, q)) } : x)));
  const remove = (v: number, e: string | undefined) => save(items.filter((x) => !same(x, v, e)));
  return <C.Provider value={{ items, count: items.reduce((s, i) => s + i.qty, 0), ready, add, setQty, remove, clear: () => save([]) }}>{children}</C.Provider>;
}
