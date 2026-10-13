'use client';
import { useState } from 'react';
export default function RowActions({ id, archived }: { id: number; archived: boolean }) {
  const [err, setErr] = useState('');
  async function call(method: string, body?: unknown) {
    const r = await fetch(`/api/admin/products/${id}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) window.location.reload(); else setErr((await r.json()).error || 'Failed');
  }
  return (<span className="row">
    <a className="btn sm alt" href={`/admin/products/${id}`}>Edit</a>
    <button className="btn sm alt" onClick={() => call('PATCH', { archived: !archived })}>{archived ? 'Restore' : 'Archive'}</button>
    <button className="btn sm danger" onClick={() => { if (confirm('Delete this product permanently? Past orders keep their details. Archive instead if unsure.')) call('DELETE'); }}>Delete</button>
    {err && <small role="alert">{err}</small>}</span>);
}
