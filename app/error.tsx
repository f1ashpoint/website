'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="section"><h1>Something slipped</h1><p>We could not load this page. Please try again. If it keeps happening, write to us and we will sort it out.</p><button className="btn" onClick={reset}>Try again</button></div>;
}
