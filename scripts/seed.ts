/* Creates the single admin account from ADMIN_EMAIL / ADMIN_PASSWORD. Safe to re-run: updates the password. Set SEED_DEMO=1 for demo products. */
import { getDb } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { saveProduct, productInput, listProducts } from '../lib/catalog';
import { DEMO } from '../lib/seedData';

export function seed() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || '';
  if (!email || !email.includes('@')) throw new Error('Set ADMIN_EMAIL to a valid email address.');
  if (pw.length < 12) throw new Error('Set ADMIN_PASSWORD to at least 12 characters.');
  if ((process.env.SESSION_SECRET || '').length < 32) throw new Error('Set SESSION_SECRET to at least 32 characters (openssl rand -hex 32).');
  const db = getDb();
  const hash = hashPassword(pw);
  db.transaction(() => {
    // Single admin account: remove any other admin, keep exactly one.
    db.prepare('DELETE FROM admins WHERE email != ?').run(email);
    db.prepare('INSERT INTO admins (email, password_hash) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash').run(email, hash);
  })();
  console.log(`Admin account ready for ${email}.`);
  if (process.env.SEED_DEMO === '1' && listProducts({ includeArchived: true }).length === 0) {
    const ids: number[] = [];
    for (const d of DEMO) ids.push(saveProduct(productInput.parse(d)));
    const byName = (n: string) => listProducts({ includeArchived: true }).find((p) => p.name === n)!.id;
    const link = (a: string, b: string) => db.prepare('INSERT OR IGNORE INTO product_addons VALUES (?,?)').run(byName(a), byName(b));
    link('Bead & Chenille Necklace', 'Clay Drop Earrings'); link('Clay Drop Earrings', 'Bead & Chenille Necklace');
    link('Hand-Stamped Clay Charm', 'Clay Care Kit'); link('Pinch-Pot Trinket Bowl', 'Clay Care Kit'); link('Glazed Stoneware Vase', 'Chenille Tulip Bouquet');
    console.log(`Seeded ${ids.length} demo products.`);
  }
}
if (!process.env.VITEST) seed();
