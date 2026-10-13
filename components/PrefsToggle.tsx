'use client';
import { useState } from 'react';
export default function PrefsToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  async function toggle() {
    const next = !on;
    const r = await fetch('/api/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personalization: next }) });
    if (r.ok) setOn(next);
  }
  return <p className="note" style={{ color: '#cfcaf5' }}>Personalised suggestions are <b>{on ? 'on' : 'off'}</b>. <button className="btn sm alt" style={{ color: '#fff', borderColor: '#fff' }} onClick={toggle}>{on ? 'Turn off and erase my activity' : 'Turn on'}</button></p>;
}
