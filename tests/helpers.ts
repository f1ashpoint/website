import { resetDbForTests, getDb } from '@/lib/db';
import { z } from 'zod';
import { saveProduct, productInput } from '@/lib/catalog';
import { hashPassword } from '@/lib/auth';

export const freshDb = () => resetDbForTests();
export function addProduct(over: Partial<z.input<typeof productInput>> = {}) {
  return saveProduct(productInput.parse({
    name: 'Test Piece', priceInr: 500, categories: ['ceramics'], variants: [{ label: 'Standard', stock: 5 }], ...over,
  }));
}
export function addAdmin(email = 'owner@example.com', pw = 'correct horse battery') {
  const db = getDb();
  db.prepare('INSERT INTO admins (email, password_hash) VALUES (?,?)').run(email, hashPassword(pw));
  return (db.prepare('SELECT id FROM admins WHERE email=?').get(email) as { id: number }).id;
}
export const variantOf = (productId: number) => (getDb().prepare('SELECT id FROM variants WHERE product_id=?').get(productId) as { id: number }).id;
export const address = { name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210', line1: '12 Lake View Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India' };
