import { describe, it, expect } from 'vitest';
import { priceOrder, extractTax, allocate } from '@/lib/pricing';
import { amountInWords } from '@/lib/money';

const rules = (o: Partial<Parameters<typeof priceOrder>[1]> = {}) => ({ intraState: true, shippingFlatPaise: 7900, freeShippingThresholdPaise: 99900, shippingGstRate: 18, ...o });

describe('GST extraction (prices are GST-inclusive)', () => {
  it('splits 5% and 18% correctly', () => {
    expect(extractTax(10500, 5)).toEqual({ taxable: 10000, tax: 500 });
    expect(extractTax(11800, 18)).toEqual({ taxable: 10000, tax: 1800 });
  });
  it('uses CGST+SGST within Tamil Nadu and IGST outside', () => {
    const l = [{ key: 'a', qty: 1, unitPaise: 11800, gstRate: 18 }];
    const tn = priceOrder(l, rules({ intraState: true }));
    expect([tn.cgstPaise > 0, tn.sgstPaise > 0, tn.igstPaise]).toEqual([true, true, 0]);
    const out = priceOrder(l, rules({ intraState: false }));
    expect([out.cgstPaise, out.sgstPaise, out.igstPaise > 0]).toEqual([0, 0, true]);
  });
  it('applies each product its own rate and keeps totals consistent', () => {
    const r = priceOrder([{ key: 'a', qty: 2, unitPaise: 10500, gstRate: 5 }, { key: 'b', qty: 1, unitPaise: 11800, gstRate: 18 }], rules());
    expect(r.lines[0].taxablePaise + r.lines[0].cgstPaise + r.lines[0].sgstPaise).toBe(21000);
    expect(r.taxablePaise + r.totalTaxPaise).toBe(r.totalPaise);
  });
});

describe('shipping threshold', () => {
  const one = (unit: number) => priceOrder([{ key: 'a', qty: 1, unitPaise: unit, gstRate: 5 }], rules());
  it('charges flat rate below the threshold', () => { const r = one(99899); expect(r.shippingPaise).toBe(7900); expect(r.freeShipping).toBe(false); expect(r.amountToFreeShippingPaise).toBe(1); });
  it('is free at exactly the threshold and above', () => { expect(one(99900).shippingPaise).toBe(0); expect(one(150000).freeShipping).toBe(true); });
  it('is configurable', () => { const r = priceOrder([{ key: 'a', qty: 1, unitPaise: 50000, gstRate: 5 }], rules({ freeShippingThresholdPaise: 40000, shippingFlatPaise: 12000 })); expect(r.shippingPaise).toBe(0); });
  it('shipping charge carries GST and is part of the total', () => { const r = one(10000); expect(r.totalPaise).toBe(10000 + 7900); expect(r.shippingTaxPaise).toBe(7900 - Math.round(7900 * 100 / 118)); });
  it('discount does not remove free shipping earned by the cart value', () => {
    const r = priceOrder([{ key: 'a', qty: 1, unitPaise: 100000, gstRate: 5 }], rules(), 20000);
    expect(r.shippingPaise).toBe(0); expect(r.totalPaise).toBe(80000);
  });
});

describe('allocation and words', () => {
  it('allocates without losing paise', () => { const a = allocate(101, [100, 100, 100]); expect(a.reduce((x, y) => x + y)).toBe(101); });
  it('writes amounts in Indian words', () => { expect(amountInWords(123456)).toBe('Rupees One Thousand Two Hundred Thirty Four and Fifty Six Paise Only'); expect(amountInWords(10000000)).toBe('Rupees One Lakh Only'); });
});
