'use client';
import { useState } from 'react';
export default function PayButtons({ token }: { token: string }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function go(outcome: 'paid' | 'failed') {
    setBusy(true); setErr('');
    const r = await fetch('/api/pay/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: token, outcome }) });
    if (!r.ok) { setErr((await r.json()).error || 'Something went wrong.'); setBusy(false); return; }
    window.location.href = `/order/${token}`;
  }
  return <div className="stack">{err && <div className="err" role="alert">{err}</div>}<div className="row"><button className="btn gold" disabled={busy} onClick={() => go('paid')}>Simulate successful payment</button><button className="btn alt" disabled={busy} onClick={() => go('failed')}>Simulate failed payment</button></div></div>;
}
