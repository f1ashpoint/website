import Link from 'next/link';
import { listProducts } from '../../../../lib/catalog';
import { getSettings } from '../../../../lib/config';
import { rupees } from '../../../../lib/money';
import RowActions from '../../../../components/admin/RowActions';
export const dynamic = 'force-dynamic';
export default function Products({ searchParams }: { searchParams: { low?: string } }) {
  const low = getSettings().lowStockThreshold;
  let ps = listProducts({ includeArchived: true });
  if (searchParams.low === '1') ps = ps.filter((p) => !p.madeToOrder && p.totalStock <= low);
  return (<div><div className="sechead"><h1>Products and stock</h1><Link className="btn" href="/admin/products/new">Add product</Link></div>
    <p className="row"><Link href="/admin/products">All</Link> <Link href="/admin/products?low=1">Low stock ({low} or fewer)</Link></p>
    <div className="scroll"><table className="t"><thead><tr><th>Product</th><th>Categories</th><th>Price</th><th>Stock by option</th><th>Lead time</th><th>Status</th><th></th></tr></thead><tbody>
      {ps.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.categories.map((c) => c.name).join(', ')}</td><td>{rupees(p.pricePaise)}</td>
        <td>{p.variants.map((v) => <div key={v.id} style={{ color: !p.madeToOrder && v.stock <= low ? '#a4142f' : undefined }}>{v.label}: {v.stock}</div>)}<small>Total {p.totalStock}</small></td>
        <td>{p.madeToOrder ? `${p.leadTimeDays} days` : 'Ready stock'}</td><td>{p.status}</td><td><RowActions id={p.id} archived={p.status === 'archived'} /></td></tr>)}
      {!ps.length && <tr><td colSpan={7}>No products yet. Add your first one.</td></tr>}</tbody></table></div></div>);
}
