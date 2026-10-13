// Generates placeholder product illustrations (original, simple SVG). Owners replace them via the admin image upload.
const fs = require('fs'); const path = require('path');
const out = path.join(__dirname, '..', 'public', 'products'); fs.mkdirSync(out, { recursive: true });
const wrap = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img"><rect width="600" height="600" fill="${bg}"/>${body}</svg>`;
const fuzz = (d, c, w = 14) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${w * 0.28}" stroke-dasharray="2 7" stroke-linecap="round"/>`;
const A = {
  bouquet: (c) => fuzz('M300 520 C300 420 250 360 210 250', c[0]) + fuzz('M300 520 C300 400 300 330 300 200', c[1]) + fuzz('M300 520 C300 420 350 360 390 250', c[2]) + [[210, 235, c[0]], [300, 180, c[1]], [390, 235, c[2]]].map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="42" fill="${k}"/><circle cx="${x}" cy="${y}" r="14" fill="#fff" fill-opacity=".6"/>`).join('') + `<path d="M230 470 L370 470 L350 560 L250 560 Z" fill="${c[3]}"/>`,
  vase: (c) => `<path d="M240 540 C190 440 200 360 260 330 L260 250 L340 250 L340 330 C400 360 410 440 360 540 Z" fill="${c[0]}"/><path d="M245 470 C300 500 360 470 372 450" stroke="${c[1]}" stroke-width="10" fill="none"/>` + fuzz('M300 250 C300 190 270 160 250 120', c[2], 10) + fuzz('M300 250 C310 190 340 150 360 110', c[1], 10),
  mug: (c) => `<path d="M170 230 L170 430 Q170 500 240 500 L330 500 Q400 500 400 430 L400 230 Z" fill="${c[0]}"/><path d="M400 280 Q480 280 480 350 Q480 420 400 410" fill="none" stroke="${c[0]}" stroke-width="26"/><path d="M170 230 L400 230" stroke="${c[1]}" stroke-width="16"/><circle cx="260" cy="360" r="40" fill="${c[1]}" fill-opacity=".6"/>`,
  bowl: (c) => `<path d="M110 300 Q300 620 490 300 Z" fill="${c[0]}"/><ellipse cx="300" cy="300" rx="190" ry="40" fill="${c[1]}"/><ellipse cx="300" cy="305" rx="150" ry="26" fill="${c[2]}"/>`,
  necklace: (c) => fuzz('M120 150 C150 470 450 470 480 150', c[0], 12) + [[210, 395], [255, 430], [300, 445], [345, 430], [390, 395]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 2 ? 34 : 24}" fill="${c[(i % 2) + 1]}"/>`).join(''),
  earrings: (c) => [200, 400].map((x) => `<path d="M${x} 90 L${x} 190" stroke="#8a8a9a" stroke-width="6"/>` + fuzz(`M${x} 190 C${x - 70} 230 ${x - 60} 360 ${x} 380 C${x + 60} 360 ${x + 70} 230 ${x} 190`, c[0], 16) + `<circle cx="${x}" cy="290" r="26" fill="${c[1]}"/>`).join(''),
  hanging: (c) => `<rect x="110" y="80" width="380" height="14" rx="7" fill="#8b6b4a"/>` + [150, 230, 310, 390, 450].map((x, i) => fuzz(`M${x} 94 L${x} ${300 + (i % 3) * 70}`, c[i % 3], 12) + `<circle cx="${x}" cy="${320 + (i % 3) * 70}" r="22" fill="${c[(i + 1) % 3]}"/>`).join(''),
  favour: (c) => `<rect x="170" y="280" width="260" height="200" rx="10" fill="${c[0]}"/><rect x="170" y="280" width="260" height="40" fill="${c[1]}"/><rect x="285" y="280" width="30" height="200" fill="${c[1]}"/>` + fuzz('M300 280 C240 200 200 250 300 280 C400 250 360 200 300 280', c[2], 12),
  charm: (c) => `<path d="M300 130 L300 210" stroke="#8a8a9a" stroke-width="7"/><circle cx="300" cy="190" r="14" fill="none" stroke="#8a8a9a" stroke-width="6"/><path d="M300 230 C380 150 480 250 300 450 C120 250 220 150 300 230" fill="${c[0]}"/><circle cx="260" cy="270" r="14" fill="#fff" fill-opacity=".5"/><path d="M200 520 H400" stroke="${c[1]}" stroke-width="12" stroke-linecap="round"/>`,
  kit: (c) => `<rect x="130" y="260" width="340" height="220" rx="16" fill="${c[0]}"/><rect x="160" y="300" width="120" height="140" rx="10" fill="${c[1]}"/><rect x="310" y="300" width="130" height="60" rx="10" fill="${c[2]}"/><circle cx="375" cy="410" r="32" fill="${c[1]}"/>`,
  tote: (c) => `<path d="M200 200 C200 90 400 90 400 200" fill="none" stroke="${c[1]}" stroke-width="14"/><path d="M150 200 H450 L475 520 H125 Z" fill="${c[0]}"/>` + fuzz('M200 330 Q250 280 300 330 T400 330', c[2], 12) + fuzz('M200 400 Q250 350 300 400 T400 400', c[1], 12),
};
const P = [
  ['bouquet-1', 'bouquet', '#EEF0FF', ['#F2A900', '#D63A74', '#0F8B7E', '#3A4BA8']], ['bouquet-2', 'bouquet', '#FFF1D6', ['#3A6FF7', '#D63A74', '#F2A900', '#0F8B7E']],
  ['vase-1', 'vase', '#E9F6F3', ['#3A4BA8', '#F2A900', '#D63A74']], ['vase-2', 'vase', '#F9E8F0', ['#0F8B7E', '#F2A900', '#3A4BA8']],
  ['mug-1', 'mug', '#EEF0FF', ['#0F8B7E', '#F2A900']], ['mug-2', 'mug', '#FFF1D6', ['#D63A74', '#3A4BA8']],
  ['bowl-1', 'bowl', '#F9E8F0', ['#3A4BA8', '#F2A900', '#D63A74']], ['bowl-2', 'bowl', '#E9F6F3', ['#D63A74', '#3A4BA8', '#F2A900']],
  ['necklace-1', 'necklace', '#EEF0FF', ['#D63A74', '#F2A900', '#0F8B7E']], ['necklace-2', 'necklace', '#FFF1D6', ['#3A6FF7', '#D63A74', '#F2A900']],
  ['earrings-1', 'earrings', '#E9F6F3', ['#D63A74', '#F2A900']], ['earrings-2', 'earrings', '#F9E8F0', ['#3A6FF7', '#0F8B7E']],
  ['hanging-1', 'hanging', '#FFF1D6', ['#D63A74', '#0F8B7E', '#3A6FF7']], ['hanging-2', 'hanging', '#EEF0FF', ['#F2A900', '#D63A74', '#0F8B7E']],
  ['favour-1', 'favour', '#F9E8F0', ['#3A4BA8', '#F2A900', '#D63A74']], ['favour-2', 'favour', '#E9F6F3', ['#D63A74', '#F2A900', '#3A4BA8']],
  ['charm-1', 'charm', '#EEF0FF', ['#D63A74', '#F2A900']], ['charm-2', 'charm', '#FFF1D6', ['#0F8B7E', '#3A4BA8']],
  ['kit-1', 'kit', '#E9F6F3', ['#3A4BA8', '#F2A900', '#D63A74']], ['kit-2', 'kit', '#F9E8F0', ['#0F8B7E', '#F2A900', '#3A4BA8']],
  ['tote-1', 'tote', '#FFF1D6', ['#3A4BA8', '#D63A74', '#F2A900']], ['tote-2', 'tote', '#EEF0FF', ['#0F8B7E', '#F2A900', '#D63A74']],
];
for (const [n, k, bg, c] of P) fs.writeFileSync(path.join(out, n + '.svg'), wrap(bg, A[k](c)));
console.log('wrote', P.length, 'illustrations');
