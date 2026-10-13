'use client';
import Link from 'next/link';
import { useCart } from './CartProvider';
export default function CartLink() {
  const { count } = useCart();
  return <Link className="cartlink" href="/cart" aria-label={`Cart, ${count} items`}>Cart <b>{count}</b></Link>;
}
