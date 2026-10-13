import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import './globals.css';
import CartProvider from '@/components/CartProvider';
import CartLink from '@/components/CartLink';
import PrefsToggle from '@/components/PrefsToggle';
import { listCategories } from '@/lib/catalog';
import { store, getSettings } from '@/lib/config';
import { rupees } from '@/lib/money';
import { NOPERS_COOKIE } from '@/lib/behavior';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Chenille Stem Crafts | Handmade in Chennai', template: '%s | Chenille Stem Crafts' }, description: 'Handmade clay, fibre, ceramics, decor, accessories and wedding favours from a small Chennai studio. Delivered across India.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f1b4d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cats = listCategories(); const s = getSettings(); const st = store();
  const persOn = !cookies().get(NOPERS_COOKIE);
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=Young+Serif&display=swap" />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <CartProvider>
          <div className="topbar">Free shipping across India on orders of {rupees(s.freeShippingThresholdPaise)} and above. Prices include GST.</div>
          <header className="site"><div className="wrap bar">
            <Link href="/" className="logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 28 C10 6 16 34 21 14 C25 0 32 30 36 10" fill="none" stroke="#d63a74" strokeWidth="5" strokeLinecap="round"/><path d="M5 28 C10 6 16 34 21 14 C25 0 32 30 36 10" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="1 4" strokeLinecap="round"/></svg>Chenille Stem Crafts</Link>
            <nav className="main" aria-label="Categories">{cats.map((c) => <Link key={c.slug} href={`/category/${c.slug}`}>{c.name}</Link>)}</nav>
            <CartLink />
          </div></header>
          <main id="main" className="wrap">{children}</main>
          <footer className="site"><div className="wrap">
            <div className="cols">
              <div><h3 style={{ color: '#fff' }}>{st.name}</h3><p>{st.address}</p>{st.gstin && <p>GSTIN: {st.gstin}</p>}<p>Country of origin: India. Sold and shipped within India only.</p></div>
              <div><h3 style={{ color: '#fff' }}>Help</h3><p><Link href="/policies">Shipping, returns, privacy</Link><br /><Link href="/loyalty">Studio Circle rewards</Link><br />{st.email}{st.phone ? <><br />{st.phone}</> : null}</p></div>
              <div><h3 style={{ color: '#fff' }}>Grievance Officer</h3><p>{st.grievanceName || 'Owner'}<br />{st.grievanceEmail}<br />We acknowledge complaints within 48 hours and resolve them within one month.</p></div>
            </div>
            <PrefsToggle initialOn={persOn} />
          </div></footer>
        </CartProvider>
      </body>
    </html>
  );
}
