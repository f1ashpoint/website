// Pure pricing and GST engine. All amounts are integer paise. Listed prices are GST-inclusive (MRP style).
export interface PriceLineInput {
  key: string; qty: number; unitPaise: number; gstRate: number;
}
export interface PriceLine extends PriceLineInput {
  grossPaise: number; discountPaise: number; netPaise: number;
  taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number;
}
export interface PricingRules {
  intraState: boolean;
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number;
  shippingGstRate: number;
}
export interface PriceResult {
  lines: PriceLine[];
  itemsTotalPaise: number; discountPaise: number; shippingPaise: number; totalPaise: number;
  shippingTaxablePaise: number; shippingTaxPaise: number;
  taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number; totalTaxPaise: number;
  freeShipping: boolean; amountToFreeShippingPaise: number;
}

/** Split a GST-inclusive amount into taxable value and tax. */
export function extractTax(grossPaise: number, rate: number) {
  const taxable = Math.round((grossPaise * 100) / (100 + rate));
  return { taxable, tax: grossPaise - taxable };
}
function splitTax(tax: number, intra: boolean) {
  if (!intra) return { cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { cgst, sgst: tax - cgst, igst: 0 };
}

/** Pro-rata allocation using largest remainder, so shares always sum to the amount. */
export function allocate(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || amount === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / sum);
  const out = raw.map(Math.floor);
  let left = amount - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}

export function priceOrder(inputs: PriceLineInput[], rules: PricingRules, discountPaise = 0): PriceResult {
  const itemsTotal = inputs.reduce((s, l) => s + l.unitPaise * l.qty, 0);
  const discount = Math.max(0, Math.min(discountPaise, itemsTotal));
  const grosses = inputs.map((l) => l.unitPaise * l.qty);
  const shares = allocate(discount, grosses);
  const lines: PriceLine[] = inputs.map((l, i) => {
    const net = grosses[i] - shares[i];
    const { taxable, tax } = extractTax(net, l.gstRate);
    const sp = splitTax(tax, rules.intraState);
    return { ...l, grossPaise: grosses[i], discountPaise: shares[i], netPaise: net, taxablePaise: taxable, cgstPaise: sp.cgst, sgstPaise: sp.sgst, igstPaise: sp.igst };
  });
  // Free shipping is judged on the order value before any loyalty discount, at or above the threshold.
  const freeShipping = itemsTotal > 0 && itemsTotal >= rules.freeShippingThresholdPaise;
  const shipping = itemsTotal === 0 || freeShipping ? 0 : rules.shippingFlatPaise;
  const ship = extractTax(shipping, rules.shippingGstRate);
  const shipSplit = splitTax(ship.tax, rules.intraState);
  const sum = (f: (l: PriceLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const cgst = sum((l) => l.cgstPaise) + shipSplit.cgst;
  const sgst = sum((l) => l.sgstPaise) + shipSplit.sgst;
  const igst = sum((l) => l.igstPaise) + shipSplit.igst;
  const taxable = sum((l) => l.taxablePaise) + ship.taxable;
  return {
    lines, itemsTotalPaise: itemsTotal, discountPaise: discount, shippingPaise: shipping,
    totalPaise: itemsTotal - discount + shipping,
    shippingTaxablePaise: ship.taxable, shippingTaxPaise: ship.tax,
    taxablePaise: taxable, cgstPaise: cgst, sgstPaise: sgst, igstPaise: igst, totalTaxPaise: cgst + sgst + igst,
    freeShipping,
    amountToFreeShippingPaise: itemsTotal === 0 ? rules.freeShippingThresholdPaise : Math.max(0, rules.freeShippingThresholdPaise - itemsTotal),
  };
}
