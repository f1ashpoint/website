import Link from 'next/link';
import { cookies } from 'next/headers';
import ProductCard from '@/components/ProductCard';
import { listCategories, listProducts } from '@/lib/catalog';
import { getRecommendations } from '@/lib/reco';
import { VISITOR_COOKIE, NOPERS_COOKIE } from '@/lib/behavior';
import { getSettings } from '@/lib/config';
import { rupees } from '@/lib/money';

export const dynamic = 'force-dynamic';
export default function Home() {
  const cats = listCategories(); const featured = listProducts({ featured: true, limit: 8 });
  const c = cookies(); const pers = !c.get(NOPERS_COOKIE);
  const recos = pers ? getRecommendations(c.get(VISITOR_COOKIE)?.value, 4) : [];
  const personal = recos.some((r) => r.tier !== 'new'); const s = getSettings();
  return (<>
    <section className="hero"><div className="grid">
      <div>
        <h1>Soft stems, firm hands, made in Chennai.</h1>
        <p className="lead">Chenille flowers, clay charms, glazed ceramics and wedding favours, shaped one at a time in a small studio and sent to your door anywhere in India.</p>
        <div className="row"><Link className="btn gold" href="/shop">Shop the studio</Link><Link className="btn alt" href="/category/wedding-events">Wedding and events</Link></div>
        <p className="note" style={{ marginTop: 14 }}>Free delivery from {rupees(s.freeShippingThresholdPaise)}. GST included in every price.</p>
      </div>
      <svg className="squig" viewBox="0 0 520 420" role="img" aria-label="A twisting chenille stem in pink, gold and teal">
        {[['#d63a74', 'M20 340 C90 40 150 400 230 190 C290 20 340 380 400 150 C430 40 480 200 500 90', 26], ['#f2a900', 'M20 380 C110 150 170 420 250 260 C320 110 380 400 500 200', 22], ['#0f8b7e', 'M20 300 C70 200 130 330 200 120 C250 0 330 300 380 90 C420 -20 470 160 500 20', 18]].map(([col, d, w], i) => (
          <g key={i}><path className="draw" pathLength={1} d={d as string} fill="none" stroke={col as string} strokeWidth={w as number} strokeLinecap="round" />
          <path d={d as string} fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth={(w as number) * 0.25} strokeDasharray="2 8" strokeLinecap="round" /></g>))}
      </svg>
    </div></section>
    <section className="section" aria-labelledby="cats"><h2 id="cats">Shop by craft</h2>
      <div className="cats">{cats.map((c, i) => <Link key={c.slug} href={`/category/${c.slug}`} className={`cat c${i}`}><h3>{c.name}</h3><span>{c.blurb}</span></Link>)}</div>
    </section>
    <section className="section" aria-labelledby="feat"><div className="sechead"><h2 id="feat">Studio favourites</h2><Link href="/shop">See everything</Link></div>
      <div className="grid4">{featured.length ? featured.map((p) => <ProductCard key={p.id} p={p} />) : <p>New pieces are being photographed. Please check back soon.</p>}</div>
    </section>
    {recos.length > 0 && <section className="section" aria-labelledby="rec"><div className="sechead"><h2 id="rec">{personal ? 'Picked for you' : 'New from the studio'}</h2>{personal && <span className="note">Based only on what you viewed, carted or bought on this site. You can switch this off in the footer.</span>}</div>
      <div className="grid4">{recos.map((r) => <ProductCard key={r.product.id} p={r.product} reason={r.reason} />)}</div></section>}
    <section className="section"><div className="box"><h2>How we make and ship</h2><p>Ready pieces ship from Chennai within the days shown on the product page. Made-to-order pieces show their own dispatch date before you pay, calculated from the lead time we set for that piece. Nothing on this site is a countdown. Stock numbers are the real numbers on our shelf.</p></div></section>
  </>);
}
