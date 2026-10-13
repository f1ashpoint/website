import Listing, { type Search } from '@/components/Filters';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop everything' };
export default function Shop({ searchParams }: { searchParams: Search }) {
  return <div className="section"><h1>Everything in the studio</h1><Listing sp={searchParams} action="/shop" /></div>;
}
