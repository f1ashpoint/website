import { notFound } from 'next/navigation';
import Listing, { type Search } from '@/components/Filters';
import { listCategories } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export function generateMetadata({ params }: { params: { slug: string } }) { return { title: listCategories().find((c) => c.slug === params.slug)?.name ?? 'Category' }; }
export default function Category({ params, searchParams }: { params: { slug: string }; searchParams: Search }) {
  const c = listCategories().find((x) => x.slug === params.slug); if (!c) notFound();
  return <div className="section"><h1>{c.name}</h1><p>{c.blurb}</p><Listing category={c.slug} sp={searchParams} action={`/category/${c.slug}`} /></div>;
}
