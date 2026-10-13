import { listProducts } from '@/lib/catalog';
import ProductCard from './ProductCard';

export interface Search { q?: string; min?: string; max?: string; stock?: string; mto?: string; sort?: string }
export default function Listing({ category, sp, action }: { category?: string; sp: Search; action: string }) {
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) * 100 : undefined);
  const sort = (['new', 'price-asc', 'price-desc'] as const).find((x) => x === sp.sort) ?? 'new';
  const items = listProducts({ category, q: sp.q?.slice(0, 60), minPaise: num(sp.min), maxPaise: num(sp.max), inStock: sp.stock === '1', madeToOrder: sp.mto === '1', sort });
  return (<>
    <form className="filters" method="get" action={action} aria-label="Filter products">
      <label>Search<input name="q" defaultValue={sp.q} placeholder="e.g. mug" /></label>
      <label>Min price (₹)<input name="min" inputMode="numeric" pattern="[0-9]*" defaultValue={sp.min} style={{ width: 100 }} /></label>
      <label>Max price (₹)<input name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={sp.max} style={{ width: 100 }} /></label>
      <label>Sort<select name="sort" defaultValue={sort}><option value="new">Newest</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option></select></label>
      <label className="chk"><input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === '1'} />In stock or made to order</label>
      <label className="chk"><input type="checkbox" name="mto" value="1" defaultChecked={sp.mto === '1'} />Made to order only</label>
      <button className="btn sm" type="submit">Apply</button><a className="btn sm alt" href={action}>Clear</a>
    </form>
    <p className="note" aria-live="polite">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
    <div className="grid4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    {!items.length && <div className="box"><p>Nothing matches those filters. Try widening the price range or clearing them.</p></div>}
  </>);
}
