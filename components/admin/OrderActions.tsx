'use client';
import { useState } from 'react';
export default function OrderActions({ id, status, awb }: { id: number; status: string; awb: string }) {
  const [a, setA] = useState(awb); const [err, setErr] = useState('');
  async function patch(body: object) { const r = await fetch(`/api/admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) window.location.reload(); else setErr((await r.json()).error || 'Failed'); }
  if (['pending_payment', 'expired', 'payment_failed'].includes(status)) return <small>Not paid</small>;
  return (<div className="row"><input value={a} onChange={(e) => setA(e.target.value)} placeholder="Tracking no." aria-label="Tracking number" style={{ width: 130 }} />
    <button className="btn sm alt" onClick={() => patch({ awb: a, status: 'shipped' })}>Mark shipped</button><button className="btn sm alt" onClick={() => patch({ status: 'delivered' })}>Delivered</button>{err && <small role="alert">{err}</small>}</div>);
}
