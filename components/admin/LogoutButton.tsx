'use client';
export default function LogoutButton() {
  return <button className="btn sm alt" onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }}>Sign out</button>;
}
