import { notFound } from 'next/navigation';
import ProductForm from '../../../../../components/admin/ProductForm';
import { listCategories, listProducts, getProductById } from '../../../../../lib/catalog';
import { getDb } from '../../../../../lib/db';
import { getSettings } from '../../../../../lib/config';
export const dynamic = 'force-dynamic';
export default function Edit({ params }: { params: { id: string } }) {
  const p = getProductById(Number(params.id)); if (!p) notFound();
  const raw = getDb().prepare('SELECT gst_rate FROM products WHERE id=?').get(p.id) as { gst_rate: number | null };
  return <ProductForm categories={listCategories()} others={listProducts({ includeArchived: true }).map((x) => ({ id: x.id, name: x.name }))} defaultGst={getSettings().categoryGst}
    initial={{ id: p.id, name: p.name, description: p.description, priceInr: String(p.pricePaise / 100), categories: p.categories.map((c) => c.slug), gstRate: raw.gst_rate === null ? '' : String(raw.gst_rate), hsn: p.hsn,
      leadTimeDays: p.leadTimeDays === null ? '' : String(p.leadTimeDays), featured: p.featured, engraving: { enabled: p.engraving.enabled, max: String(p.engraving.max), feeInr: String(p.engraving.feePaise / 100) },
      variants: p.variants.map((v) => ({ id: v.id, label: v.label, sku: v.sku, priceInr: v.pricePaise === p.pricePaise ? '' : String(v.pricePaise / 100), stock: String(v.stock) })), images: p.images, addonIds: p.addonIds }} />;
}
