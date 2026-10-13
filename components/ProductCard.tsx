import Link from 'next/link';
import type { Product } from '@/lib/catalog';
import { rupees } from '@/lib/money';
import { getSettings } from '@/lib/config';

export function stockTag(p: Product, low: number) {
  if (p.madeToOrder) return { text: 'Made to order', cls: '' };
  if (p.totalStock === 0) return { text: 'Sold out', cls: 'bad' };
  if (p.totalStock <= low) return { text: `Only ${p.totalStock} left`, cls: 'warn' };
  return null;
}
export default function ProductCard({ p, reason }: { p: Product; reason?: string }) {
  const low = getSettings().lowStockThreshold; const t = stockTag(p, low);
  const prices = p.variants.map((v) => v.pricePaise); const from = Math.min(...prices, p.pricePaise);
  return (
    <Link href={`/product/${p.slug}`} className="pcard">
      <div className="im">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt} loading="lazy" /> : null}</div>
      <div className="tx">
        <span className="nm">{p.name}</span>
        <span className="price">{prices.some((x) => x !== from) ? 'From ' : ''}{rupees(from)}</span>
        {t && <span className={`tag ${t.cls}`}>{t.text}</span>}
        {reason && <span className="reason">{reason}</span>}
      </div>
    </Link>
  );
}
