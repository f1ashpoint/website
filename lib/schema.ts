export const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, blurb TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  gst_rate REAL, hsn TEXT NOT NULL DEFAULT '',
  lead_time_days INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  engraving_enabled INTEGER NOT NULL DEFAULT 0, engraving_max INTEGER NOT NULL DEFAULT 20, engraving_fee_paise INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS product_categories (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', price_paise INTEGER CHECK (price_paise IS NULL OR price_paise >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, alt TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product_addons (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_product_id)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, token TEXT UNIQUE NOT NULL, number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  email TEXT NOT NULL, phone TEXT NOT NULL, name TEXT NOT NULL,
  ship_line1 TEXT NOT NULL, ship_line2 TEXT NOT NULL DEFAULT '', ship_city TEXT NOT NULL, ship_state TEXT NOT NULL,
  ship_pincode TEXT NOT NULL, ship_country TEXT NOT NULL DEFAULT 'India',
  items_total_paise INTEGER NOT NULL, discount_paise INTEGER NOT NULL DEFAULT 0, shipping_paise INTEGER NOT NULL,
  total_paise INTEGER NOT NULL, taxable_paise INTEGER NOT NULL, cgst_paise INTEGER NOT NULL, sgst_paise INTEGER NOT NULL, igst_paise INTEGER NOT NULL,
  shipping_taxable_paise INTEGER NOT NULL DEFAULT 0, shipping_tax_paise INTEGER NOT NULL DEFAULT 0, shipping_gst_rate REAL NOT NULL DEFAULT 0,
  intra_state INTEGER NOT NULL DEFAULT 1,
  loyalty_enrolled INTEGER NOT NULL DEFAULT 0, points_redeemed INTEGER NOT NULL DEFAULT 0, points_earned INTEGER NOT NULL DEFAULT 0,
  payment_provider TEXT NOT NULL DEFAULT '', payment_ref TEXT NOT NULL DEFAULT '',
  shipping_provider TEXT NOT NULL DEFAULT '', awb TEXT NOT NULL DEFAULT '', tracking_url TEXT NOT NULL DEFAULT '',
  dispatch_by TEXT, visitor_id TEXT, notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), paid_at TEXT, expires_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER, variant_id INTEGER, name TEXT NOT NULL, variant_label TEXT NOT NULL DEFAULT '', hsn TEXT NOT NULL DEFAULT '',
  gst_rate REAL NOT NULL, qty INTEGER NOT NULL, unit_paise INTEGER NOT NULL, gross_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL DEFAULT 0, taxable_paise INTEGER NOT NULL, cgst_paise INTEGER NOT NULL, sgst_paise INTEGER NOT NULL, igst_paise INTEGER NOT NULL,
  engraving TEXT NOT NULL DEFAULT '', made_to_order INTEGER NOT NULL DEFAULT 0, stock_reserved INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY, order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id), number TEXT UNIQUE NOT NULL,
  issued_at TEXT NOT NULL, seller_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoice_counters (fy TEXT PRIMARY KEY, last INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS loyalty_members (email TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', points INTEGER NOT NULL DEFAULT 0, enrolled_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS loyalty_ledger (id INTEGER PRIMARY KEY, email TEXT NOT NULL, order_id INTEGER, delta INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, visitor_id TEXT NOT NULL, product_id INTEGER NOT NULL, type TEXT NOT NULL CHECK (type IN ('view','cart','purchase')), created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id);
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
`;

export const CATEGORIES = [
  { slug: 'clay', name: 'Air-Dry Clay & Polymer Clay', blurb: 'Charms, trinket dishes and small sculpted pieces, shaped by hand.' },
  { slug: 'fiber-textile', name: 'Fiber & Textile Art', blurb: 'Chenille, thread and cloth worked into soft, tactile things.' },
  { slug: 'ceramics', name: 'Handmade Ceramics', blurb: 'Wheel-thrown and hand-built mugs, bowls and vases.' },
  { slug: 'home-decor', name: 'Aesthetic Home Decor', blurb: 'Quiet, colourful objects for shelves, walls and windowsills.' },
  { slug: 'accessories', name: 'Personal Accessories', blurb: 'Earrings, necklaces and little things to wear every day.' },
  { slug: 'wedding-events', name: 'Wedding & Events', blurb: 'Favours, table pieces and keepsakes made in batches.' },
];
