import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySession } from '../../../lib/auth';
import LogoutButton from '../../../components/admin/LogoutButton';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export default function Panel({ children }: { children: React.ReactNode }) {
  if (!verifySession(cookies().get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  return (<div className="admin"><nav aria-label="Admin"><Link href="/admin/products">Products and stock</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/settings">Shipping and GST</Link><LogoutButton /></nav><div>{children}</div></div>);
}
