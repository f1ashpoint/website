'use client';
import { useEffect } from 'react';
export default function TrackView({ productId }: { productId: number }) {
  useEffect(() => { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, type: 'view' }) }).catch(() => {}); }, [productId]);
  return null;
}
