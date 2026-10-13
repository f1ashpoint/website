import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Gallery from '@/components/Gallery';
import ProductBuy from '@/components/ProductBuy';
import Upsell from '@/components/Upsell';
import TrackView from '@/components/TrackView';
import ProductCard from '@/components/ProductCard';
import { getProductBySlug, listProducts, dispatchDate, formatDate } from '@/lib/catalog';
import { getSettings } from '@/lib/config';
import { getRecommendations } from '@/lib/reco';
import { VISITOR_COOKIE, NOPERS_COOKIE } from '@/lib/behavior';

export const dynamic = 'force-dynamic';
export function generateMetadata({ params }: { params: { slug: string } }) { const p = getProductBySlug(params.slug); return { title: p?.name ?? 'Product', description: p?.description.slice(0, 150) }; }

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProductBySlug(params.slug); if (!p) notFound();
  const s = getSettings(); const c = cookies(); const pers = !c.get(NOPERS_COOKIE);
  const add = listProducts({ ids: p.addonIds, inStock: true }).slice(0, 3).map((a) => ({ id: a.id, slug: a.slug, name: a.name, pricePaise: a.pricePaise, image: a.images[0]?.url ?? null, variantId: a.variants.find((v) => a.madeToOrder || v.stock > 0)?.id ?? null, hasChoices: a.variants.length > 1 || a.engraving.enabled }));
  const recos = pers ? getRecommendations(c.get(VISITOR_COOKIE)?.value, 4, [p.id]) : [];
  const dispatch = p.madeToOrder ? formatDate(dispatchDate(p.leadTimeDays ?? 0)) : null;
  return (<>
    {pers && <TrackView productId={p.id} />}
    <p className="crumb"><Link href="/shop">Shop</Link>{p.categories[0] && <> / <Link href={`/category/${p.categories[0].slug}`}>{p.categories[0].name}</Link></>}</p>
    <div className="pdp">
      <Gallery images={p.images} />
      <div className="stack">
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)' }}>{p.name}</h1>
        <p>{p.description}</p>
        <ProductBuy productId={p.id} variants={p.variants} madeToOrder={p.madeToOrder} lowStock={s.lowStockThreshold} engraving={p.engraving} dispatchBy={dispatch} />
        <Upsell items={add} heading="Goes well with this" />
        <div className="box note"><b>Good to know.</b> GST at {p.gstRate}% is included in the price{p.hsn ? ` (HSN ${p.hsn})` : ''}. Country of origin: India. Handmade, so small variations are normal. Delivery within India only. {p.madeToOrder ? 'Made-to-order pieces are made for you, so they cannot be returned unless faulty.' : 'See our '}{!p.madeToOrder && <Link href="/policies">return policy</Link>}.</div>
      </div>
    </div>
    {recos.length > 0 && <section className="section"><h2>{recos.some((r) => r.tier !== 'new') ? 'You might also like' : 'New from the studio'}</h2><div className="grid4">{recos.map((r) => <ProductCard key={r.product.id} p={r.product} reason={r.reason} />)}</div></section>}
  </>);
}
