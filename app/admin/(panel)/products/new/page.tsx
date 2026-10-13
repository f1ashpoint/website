import ProductForm, { blankForm } from '../../../../../components/admin/ProductForm';
import { listCategories, listProducts } from '../../../../../lib/catalog';
import { getSettings } from '../../../../../lib/config';
export const dynamic = 'force-dynamic';
export default function New() { return <ProductForm initial={blankForm} categories={listCategories()} others={listProducts({ includeArchived: true }).map((p) => ({ id: p.id, name: p.name }))} defaultGst={getSettings().categoryGst} />; }
