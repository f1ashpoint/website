import CartView from '@/components/CartView';
export const metadata = { title: 'Your cart' };
export default function Cart() { return <div className="section" style={{ paddingTop: 24 }}><h1>Your cart</h1><CartView /></div>; }
