'use client';
import { useState } from 'react';
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (r.ok) window.location.href = '/admin/products'; else { setErr((await r.json()).error || 'Could not sign in.'); setBusy(false); }
  }
  return (<div className="section" style={{ maxWidth: 420 }}><h1>Owner sign in</h1>
    <form className="stack" onSubmit={go}>{err && <div className="err" role="alert">{err}</div>}
      <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
      <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div>);
}
