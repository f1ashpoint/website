'use client';
import { useState } from 'react';
export default function Gallery({ images }: { images: { url: string; alt: string }[] }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="gal"><div className="main" /></div>;
  return (<div className="gal"><div className="main"><img src={images[i].url} alt={images[i].alt} /></div>
    {images.length > 1 && <div className="thumbs">{images.map((im, k) => <button key={k} aria-label={`Show image ${k + 1}`} aria-current={k === i} onClick={() => setI(k)}><img src={im.url} alt="" /></button>)}</div>}</div>);
}
