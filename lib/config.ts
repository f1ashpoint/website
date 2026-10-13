import { getDb } from './db';

import { INDIAN_STATES, stateCode } from './states';
export { INDIAN_STATES, stateCode };
export interface Settings {
  originState: string;
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number;
  shippingGstRate: number;
  categoryGst: Record<string, number>;
  lowStockThreshold: number;
  orderHoldMinutes: number;
  loyaltyEarnPerRupees: number;
  loyaltyPointValuePaise: number;
  loyaltyMaxRedeemPct: number;
}

// Defaults are starting points only. The owner edits them in Admin > Settings.
export const DEFAULT_SETTINGS: Settings = {
  originState: 'Tamil Nadu',
  shippingFlatPaise: 7900,
  freeShippingThresholdPaise: 99900,
  shippingGstRate: 18,
  categoryGst: { clay: 5, 'fiber-textile': 5, ceramics: 5, 'home-decor': 18, accessories: 18, 'wedding-events': 18 },
  lowStockThreshold: 5,
  orderHoldMinutes: 30,
  loyaltyEarnPerRupees: 50,
  loyaltyPointValuePaise: 100,
  loyaltyMaxRedeemPct: 20,
};

export function getSettings(): Settings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const out: Settings = { ...DEFAULT_SETTINGS, categoryGst: { ...DEFAULT_SETTINGS.categoryGst } };
  for (const r of rows) {
    try {
      const v = JSON.parse(r.value);
      if (r.key === 'categoryGst') out.categoryGst = { ...out.categoryGst, ...v };
      else if (r.key in out) (out as unknown as Record<string, unknown>)[r.key] = v;
    } catch { /* ignore a corrupt row and keep the default */ }
  }
  return out;
}

export function saveSettings(patch: Partial<Settings>) {
  const db = getDb();
  const up = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  db.transaction(() => { for (const [k, v] of Object.entries(patch)) up.run(k, JSON.stringify(v)); })();
}

export const store = () => ({
  name: process.env.STORE_LEGAL_NAME || 'Chenille Stem Crafts',
  address: process.env.STORE_ADDRESS || 'Chennai, Tamil Nadu, India',
  gstin: process.env.STORE_GSTIN || '',
  pan: process.env.STORE_PAN || '',
  email: process.env.STORE_EMAIL || 'hello@example.com',
  phone: process.env.STORE_PHONE || '',
  grievanceName: process.env.GRIEVANCE_OFFICER_NAME || '',
  grievanceEmail: process.env.GRIEVANCE_OFFICER_EMAIL || process.env.STORE_EMAIL || '',
});
