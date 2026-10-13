import { describe, it, expect, beforeEach } from 'vitest';
import { freshDb, addProduct } from './helpers';
import { listProducts, listCategories, getProductBySlug, setArchived, deleteProduct, productInput, saveProduct, dispatchDate } from '@/lib/catalog';

beforeEach(() => { freshDb(); });
describe('catalog', () => {
  it('has all six categories in navigation order', () => {
    expect(listCategories().map((c) => c.name)).toEqual(['Air-Dry Clay & Polymer Clay', 'Fiber & Textile Art', 'Handmade Ceramics', 'Aesthetic Home Decor', 'Personal Accessories', 'Wedding & Events']);
  });
  it('filters by category, price, stock and made-to-order, and hides archived', () => {
    const a = addProduct({ name: 'Mug', priceInr: 400, categories: ['ceramics'] });
    addProduct({ name: 'Charm', priceInr: 1500, categories: ['clay'], variants: [{ label: 'S', stock: 0 }] });
    addProduct({ name: 'Favour', priceInr: 800, categories: ['wedding-events'], variants: [{ label: 'Set', stock: 0 }], leadTimeDays: 10 });
    expect(listProducts({ category: 'ceramics' }).map((p) => p.name)).toEqual(['Mug']);
    expect(listProducts({ minPaise: 50000 }).map((p) => p.name).sort()).toEqual(['Charm', 'Favour']);
    expect(listProducts({ inStock: true }).map((p) => p.name).sort()).toEqual(['Favour', 'Mug']);
    expect(listProducts({ madeToOrder: true }).map((p) => p.name)).toEqual(['Favour']);
    setArchived(a, true);
    expect(listProducts({ category: 'ceramics' })).toHaveLength(0);
    expect(listProducts({ category: 'ceramics', includeArchived: true })).toHaveLength(1);
  });
  it('supports multiple categories, variants and per-product GST defaults from settings', () => {
    addProduct({ name: 'Vase', categories: ['ceramics', 'home-decor'], variants: [{ label: 'Blue', stock: 2 }, { label: 'Pink', stock: 3, priceInr: 650 }] });
    const p = getProductBySlug('vase')!;
    expect(p.categories).toHaveLength(2); expect(p.gstRate).toBe(5); expect(p.totalStock).toBe(5); expect(p.variants[1].pricePaise).toBe(65000);
  });
  it('validates input on the server', () => {
    expect(() => productInput.parse({ name: 'x', priceInr: -1, categories: [], variants: [] })).toThrow();
    expect(() => saveProduct(productInput.parse({ name: 'Bad', priceInr: 1, categories: ['nope'], variants: [{ label: 'a', stock: 1 }] }))).toThrow(/Unknown category/);
  });
  it('deletes products and derives dispatch date from lead time', () => {
    const id = addProduct({ name: 'Temp' }); expect(deleteProduct(id)).toBe(true); expect(getProductBySlug('temp')).toBeNull();
    expect(dispatchDate(10, new Date('2026-10-13T06:00:00Z'))).toBe('2026-10-23');
  });
});
