import Link from 'next/link';
export default function NotFound() { return <div className="section"><h1>We could not find that</h1><p>The page may have moved, or the piece may have sold out and been archived.</p><Link className="btn" href="/shop">Browse the shop</Link></div>; }
