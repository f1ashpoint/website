# Chenille Stem Crafts storefront

A production-ready, India-only e-commerce site for Chenille Stem Crafts, a small maker business in Chennai, Tamil Nadu. Prices are in INR, every paid order gets a GST invoice, and the owner manages products, stock and orders from a protected admin area.

**Stack, in two sentences.** Next.js (React) serves the storefront, admin pages and the API from one codebase, so there is one thing to deploy. SQLite (via better-sqlite3) is a real relational database that needs no separate server, which suits a small shop; the data layer is plain SQL, so moving to Postgres later is a contained change.

## Contents
1. Market research and how it shaped the design
2. What is built, mapped to the brief
3. Run it locally
4. Environment variables
5. Seed script (admin account and demo data)
6. Tests
7. Tamil Nadu shipping and GST assumptions (please verify before launch)
8. Plugging in a payment gateway
9. Plugging in a delivery partner
10. Deploy: GitHub and Railway, exact steps
11. Operations, security and known limits

---

## 1. Market research and how it shaped the design

Reviewed: Instagram-led Indian makers, boutique ceramics and clay studios, wedding favour sellers, and published guidance on Indian D2C checkout behaviour (Fynd, Innoviti, Base, Unicommerce, 2026). No competitor branding, copy or imagery was copied. Key findings and what we did with them:

| Finding | Applied as |
|---|---|
| Around 75% of Indian D2C traffic is mobile, often on patchy 4G. | Mobile-first layout, large tap targets, no heavy scripts, no account required. |
| Most shoppers arrive from an Instagram or WhatsApp link straight onto a product page. | Product page carries everything: price incl. GST, options, dispatch date, delivery and return notes. |
| Search and filters are underrated conversion tools. | Every category is filterable by price, stock and made-to-order, plus search and sort. Works without JavaScript. |
| Checkout is where most carts are lost, and forced account creation is a top killer. | Guest checkout, one page, clear total before the pay step. |
| UPI and cards matter most, COD is still large in small towns. | Payment layer is provider-based so UPI, cards and netbanking come from your chosen gateway. COD is deliberately not built (the brief says prepaid INR only). |
| Trust signals (address, phone, grievance contact) lift conversion. | Footer shows legal name, address, GSTIN, grievance officer. |
| Maker pages sell with warm, tactile photography and clear, whole-rupee prices. | Soft chenille-stem visual language, whole-rupee display, "from" price when options differ. |
| Wedding sellers sell in batches with lead times. | Per-product made-to-order lead time with a real dispatch date. |

Design direction: a fuzzy chenille-stem squiggle is the single memorable element (it draws itself once on the home page, and respects reduced-motion settings). Palette is deep indigo ink, marigold, jade and hibiscus on a pale lilac paper, avoiding the usual cream and terracotta craft look. Type is Young Serif for headings and Figtree for text, loaded from Google Fonts with safe fallbacks. Product images in the demo data are original placeholder illustrations, to be replaced with your own photographs through the admin.

## 2. What is built, mapped to the brief

**Storefront.** Home (hero, six category tiles, featured grid, recommendations), category pages with filters, product pages with gallery and variants, cart, one-page checkout, sandbox payment page, order page, GST invoice (HTML and PDF), Studio Circle page, policies page. All six categories are in the navigation and the catalog.

**Persuasion features, kept honest.**
- *Scarcity and urgency.* "Only N left" appears only when the real database stock is at or below the low-stock threshold (default 5, editable). There are no timers, no fake viewer counts. Each product has its own optional made-to-order lead time set in the admin, and the dispatch date shown to customers (product page, cart, checkout, order) is today plus that lead time. There are no category-based rules. Made-to-order items ignore stock counts and never show scarcity.
- *Personalisation.* Recommendations use on-site behaviour only (viewed, carted, purchased) in tiers: bought, then carted, then viewed, then "New from the studio" as a fallback. Each card says why it is shown. A random first-party visitor ID is stored only after a view or add-to-cart. The footer switch turns personalisation off and erases the stored activity. Customisation: variants (colour, size) and optional engraving text with its own character limit and fee.
- *Opt-in loyalty ("Studio Circle").* A checkbox at checkout, unchecked by default, with a plain description. Nobody is auto-enrolled. Members earn 1 point per ₹50 of products (editable) once payment is confirmed, and can redeem points as a discount (1 point = ₹1, capped at 20% of the product total, editable). The `/loyalty` page states exactly this and nothing else.
- *Upsell and cross-sell.* Owner-chosen add-ons per product, shown on product and cart pages in a box labelled "Suggested add-on" or "Goes well with this", with a dismiss button. Nothing is ever pre-selected or added automatically.

**Checkout, shipping and tax.** Listed prices include GST. The cart and checkout show items, shipping and the total, plus how much of it is GST (CGST and SGST inside Tamil Nadu, IGST elsewhere) before payment. Shipping is a configurable flat rate below a configurable order value, and free at or above it (exactly at the threshold is free). Addresses must have an Indian state, a valid 6-digit PIN code and country India. Anything else is rejected by the server with a clear message. A GST invoice is issued when payment is confirmed, with sequential numbers per financial year (April to March), and the customer can view and download it.

**Admin.** Sign in at `/admin`. Add, edit, archive, restore and delete products (name, description, one or more categories, price, GST rate and HSN, variants with their own stock and optional price, images with upload, made-to-order lead time, engraving, add-ons). Stock view with low-stock filter, orders list with invoice links and shipping updates, and a Shipping and GST settings page. One admin account, created by the seed script from environment variables.

**Integration readiness.** `lib/providers/payment.ts` and `lib/providers/shipping.ts` define the interfaces. Core checkout only calls the interfaces. A stub payment provider (sandbox, no money moves) and a flat-rate shipping provider are included.

## 3. Run it locally

Requires Node.js 20 or newer (built and tested on Node 22).

```bash
npm install
cp .env.example .env        # then edit: set SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed                # creates the admin; add SEED_DEMO=1 in .env for demo products
npm run dev                 # http://localhost:3000
```

The sandbox payment page works in development automatically. In production it is blocked unless you set `ALLOW_STUB_PAYMENTS=1` (demo only).

## 4. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | 32+ random characters. Signs admin sessions. `openssl rand -hex 32` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | The single admin account. Password at least 12 characters. |
| `DATABASE_PATH` | no | SQLite file. Default `./data/store.db`, or `store.db` inside the Railway volume if one is attached. Back this file up. |
| `UPLOAD_DIR` | no | Uploaded images. Default `./data/uploads`, or `uploads` inside the Railway volume. Back this up too. |
| `SITE_URL` | recommended | Public URL of the site. |
| `STORE_LEGAL_NAME`, `STORE_ADDRESS`, `STORE_GSTIN`, `STORE_PAN`, `STORE_EMAIL`, `STORE_PHONE` | yes before launch | Printed on invoices and in the footer. |
| `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_EMAIL` | yes before launch | Shown in the footer and policies (Indian e-commerce rules ask for this). |
| `PAYMENT_PROVIDER` | no | `stub` (default) or the id of a provider you register. |
| `SHIPPING_PROVIDER` | no | `flat` (default) or the id of a provider you register. |
| `ALLOW_STUB_PAYMENTS` | no | `1` allows the sandbox payment page when `NODE_ENV=production`. Demo only. |
| `SEED_DEMO` | no | `1` also loads 11 demo products when the catalog is empty. |
| `PORT` | no | Set by Railway automatically. Default 3000 locally. |

No secrets are hardcoded anywhere. `.env` is git-ignored.

## 5. Seed script

`npm run seed` (local) creates the single admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. On Railway it also runs automatically on every start (see section 10). It is safe to run again: it updates the password and removes any other admin so exactly one exists. Passwords are stored as salted scrypt hashes. With `SEED_DEMO=1` it also loads demo products and sample add-on links, but only if the catalog is empty.

## 6. Tests

```bash
npm test
```

38 automated tests across six files:
- `pricing.test.ts`: GST extraction at 5% and 18%, CGST/SGST versus IGST, free-shipping threshold edge cases (just below, exactly at, above, configurable), discount allocation, amount in words.
- `catalog.test.ts`: six categories, filters (category, price, stock, made-to-order), archived items hidden, multi-category and variants, server-side validation, lead-time dispatch date.
- `checkout.test.ts`: cart prices come from the database, engraving fees, quantity above stock, non-India country and bad state, PIN or phone rejected, totals match the quote, stock decrement, stock returned on failed payment or expiry, made-to-order does not touch stock, idempotent payment confirmation, loyalty is opt-in, points redemption cap.
- `admin.test.ts`: password hashing, login, tampered and expired sessions, login rate limit, 401 on every admin endpoint without a session, cross-origin writes blocked, upload accepts only real images.
- `invoice.test.ts`: no invoice before payment, sequential numbering, 1 April rollover, seller GSTIN, HSN and place of supply, tax totals reconcile, PDF is valid and downloadable.
- `reco.test.ts`: tiered recommendations, owned items excluded, honest fallback label.

## 7. Tamil Nadu shipping and GST assumptions (please verify before launch)

**These figures are starting points from public information gathered in 2026. The owner must verify them against current carrier rate cards and current GST notifications, ideally with a chartered accountant, before launch.** Every number below is editable in Admin, Shipping and GST, and nothing is hardcoded into checkout logic.

**Origin and place of supply.** Origin state is Tamil Nadu (state code 33). If the delivery state is Tamil Nadu the supply is intra-state and tax is split equally into CGST and SGST. For every other state it is inter-state and tax is IGST. The invoice shows place of supply with its state code.

**GST rates by category (defaults).** After the GST rate rationalisation effective 22 September 2025, the main slabs are 5% and 18% (12% and 28% were removed). Government releases from October 2025 report cuts to 5% for ceramic and terracotta wares, decorative ceramics, handicraft statues and cotton or jute bags. Other tax guides say most gift, decor and artificial jewellery items stay at 18%, with handmade pottery and handicrafts at 5%. Because sources differ and the rate depends on the exact product classification (HSN), the defaults lean conservative:

| Category | Default | Why |
|---|---|---|
| Air-Dry Clay & Polymer Clay | 5% | Handmade clay and terracotta articles reported at 5%. Clay craft kits and raw clay may be 18%, so override per product. |
| Fiber & Textile Art | 5% | Handmade textile articles and cotton bags reported at 5%. Check each item's HSN. |
| Handmade Ceramics | 5% | Ceramic and decorative ceramic wares reported at 5%. |
| Aesthetic Home Decor | 18% | Many decor items are 18%. Lower this per product where a 5% handicraft entry applies. |
| Personal Accessories | 18% | Artificial jewellery is generally 18%. |
| Wedding & Events | 18% | Gift and favour items are generally 18%. |

Each product can override its rate and carry its own HSN code. The HSN codes on the demo products are examples only. Invoices print the HSN and rate per line.

**Shipping GST.** Shipping is charged GST-inclusive at 18% by default (the usual courier-service rate). If you sell mixed-rate carts, the "composite supply" rule can mean the shipping takes the rate of the principal supply. Confirm with your CA and change the rate in settings if needed.

**Shipping rates.** Published 2026 comparisons put domestic courier cost at roughly ₹20 to ₹26 per 500 g on aggregator entry plans, ₹40 to ₹90 per 500 g for standard courier via Delhivery, DTDC and similar, and ₹250 or more for premium air express. Handmade, fragile pieces need good packaging. The default is a flat ₹79 per order (GST inclusive), free at ₹999 and above. That roughly covers a standard courier parcel plus packaging for a typical order, while the free-shipping threshold nudges bigger baskets. Tune both after you see real courier invoices. Heavy or oversized items (large ceramics) may need a per-product charge, which is not built yet, see known limits.

**GST registration.** Only a GST-registered seller can charge GST and issue a tax invoice. Put your GSTIN in `STORE_GSTIN`. Whether you must register depends on turnover and on selling goods across state lines. Check this with your CA. Invoices print "Not provided" if no GSTIN is set so the gap is visible.

**Invoice numbering.** `CSC/2026-27/000001`, sequential per financial year, issued at payment confirmation. Numbers are never reused.

## 8. Plugging in a payment gateway

Core checkout never talks to a gateway directly. The flow: `createOrder` reserves stock and creates a `pending_payment` order, then calls `provider.createPayment(...)`. The customer is redirected to `action.url`. When the gateway confirms, it calls `POST /api/pay/callback` (webhook or return handler), which calls `provider.verifyCallback(...)` and then `markPaid` or `markFailed`. `markPaid` is idempotent, so duplicate webhooks are safe.

Steps to add a gateway (Razorpay, Cashfree, PayU, a bank gateway, and so on):

1. Create `lib/providers/yourgateway.ts` implementing `PaymentProvider` from `lib/providers/payment.ts`:
   ```ts
   export const yourGateway: PaymentProvider = {
     id: 'yourgateway',
     async createPayment(req) {
       // Call the gateway server-side with req.amountPaise (INR), req.orderNumber and customer details.
       // Return its payment or order id and a hosted-checkout URL.
       return { providerRef: gatewayOrderId, action: { type: 'redirect', url: hostedUrl } };
     },
     async verifyCallback(payload, headers) {
       // 1. Verify the signature using your webhook secret from process.env. Throw if invalid.
       // 2. Map the event to { orderToken, status: 'paid' | 'failed', providerRef }.
       //    Pass your own order token (req.orderToken) to the gateway as a reference or note so you can read it back here.
     },
   };
   ```
2. Register it by adding `yourgateway: () => yourGateway` to the `registry` object in `lib/providers/payment.ts`.
3. Put the gateway keys in `.env` (for example `YOURGATEWAY_KEY_ID`, `YOURGATEWAY_KEY_SECRET`, `YOURGATEWAY_WEBHOOK_SECRET`) and set `PAYMENT_PROVIDER=yourgateway`.
4. Point the gateway's webhook at `https://your-domain/api/pay/callback`. Use INR only.
5. Test in the gateway's sandbox, then a small live payment. Remember that amounts are integer paise.
6. Remove `ALLOW_STUB_PAYMENTS` from `.env`. The stub provider refuses to run in production without it.

Stock is held for 30 minutes (editable in code as `orderHoldMinutes`) and released if payment is not completed. A payment that arrives after the hold expired tries to re-take stock, and if it cannot, the order is marked `needs refund` for the owner.

## 9. Plugging in a delivery partner

`ShippingProvider` in `lib/providers/shipping.ts` has `quote()` (rate for a below-threshold order), optional `serviceable(pincode)`, and optional `createShipment()` for labels and tracking numbers.

1. Create `lib/providers/yourcourier.ts` implementing the interface. `quote()` calls the aggregator's rate API with destination PIN, weight and order value and returns `{ amountPaise, service, etaDays }` (amount should be GST-inclusive to match the rest of the site).
2. Register it in the `registry` in `lib/providers/shipping.ts` and set `SHIPPING_PROVIDER=yourcourier` plus its keys in `.env`.
3. The free-shipping threshold is still applied by core checkout, so a live quote only affects orders below it.
4. To create shipments, call `createShipment()` from the admin order action (a natural place is `app/api/admin/orders/[id]/route.ts`, when marking an order shipped) and save the returned `awb` and `trackingUrl` on the order. The orders table already has `awb`, `tracking_url` and `shipping_provider` columns.

## 10. Deploy: GitHub and Railway, exact steps

**Why a volume matters.** The shop keeps its database and uploaded images in files. Railway's normal disk is wiped on every deploy, so you must attach a Railway Volume, or your products, orders and invoices would disappear on the next deploy. Steps 4 and 5 below do this. Run exactly one instance (the included `railway.json` already sets one replica).

**1. Put the code on GitHub.** Create an empty private repository on GitHub, then from this folder:
```bash
git init
git add .
git commit -m "Chenille Stem Crafts storefront"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```
`.env` and `data/` are git-ignored, so no secrets or databases are uploaded. The included GitHub Action runs the type check and all 38 tests on every push.

**2. Create the Railway project.** In Railway choose New Project, then Deploy from GitHub repo, and pick your repository. Railway builds it with `npm run build` and starts it with `npm start` (both set in `railway.json`). The first deploy will stop with a clear message until you finish step 3, which is expected.

**3. Add variables.** In the service, open Variables and add:
```
SESSION_SECRET        a 32+ character random string (openssl rand -hex 32)
ADMIN_EMAIL           your admin login email
ADMIN_PASSWORD        at least 12 characters
SITE_URL              your public URL, for example https://www.example.com
STORE_LEGAL_NAME      Chenille Stem Crafts
STORE_ADDRESS         your registered address, Chennai, Tamil Nadu PIN
STORE_GSTIN           your GSTIN
STORE_EMAIL           contact email
STORE_PHONE           contact phone
GRIEVANCE_OFFICER_NAME   name
GRIEVANCE_OFFICER_EMAIL  email
SEED_DEMO             1 to load the demo catalogue, 0 for an empty shop
ALLOW_STUB_PAYMENTS   1 only while testing, see step 7
```
Do not set `PORT`. Railway sets it.

**4. Attach a volume.** In the service, open Settings, then Volumes, then add a volume mounted at `/data`. The app detects Railway's `RAILWAY_VOLUME_MOUNT_PATH` and stores `store.db` and `uploads/` there automatically. No other configuration is needed.

**5. Redeploy** (Deployments, then Redeploy). On start the app creates or updates the single admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and, if `SEED_DEMO=1` and the catalogue is empty, loads the demo products. To change the admin password later, change the variable and redeploy.

**6. Domain and HTTPS.** In Settings, then Networking, click Generate Domain for a free `*.up.railway.app` address, or add your own domain and create the DNS record Railway shows. Railway provides HTTPS. Set `SITE_URL` to the final address. Open `/admin` and sign in.

**7. Payments.** Real money cannot be taken until you plug in a gateway (section 8). Until then the sandbox payment page is blocked in production, so checkout cannot complete. For a demo, set `ALLOW_STUB_PAYMENTS=1`. Remove it before you go live.

**Health check.** Railway calls `/api/health` after each deploy and only switches traffic when it answers OK.

**Backups.** In Railway, use the volume's Backups tab and schedule them, or periodically download `store.db` and `uploads/` using the Railway CLI (`railway ssh`).

**Scaling.** SQLite on a volume works for one instance. If you later need more than one instance, move the data layer to Railway's Postgres first.

**Run it locally the same way Railway does.**
```bash
npm ci && npm run build
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=a-long-password-123 SESSION_SECRET=$(openssl rand -hex 32) npm start
```

## 11. Operations, security and known limits

- **Back up** `data/store.db` (with its `-wal` file, or use `sqlite3 store.db ".backup backup.db"`) and `data/uploads/`. Daily is sensible.
- **One server.** SQLite suits one app server. Run a single instance. For multiple servers or heavy traffic, move to Postgres.
- **Security built in:** server-side validation (zod) on every API input, scrypt password hashing, HMAC-signed HttpOnly SameSite cookies for the admin session, login rate limiting, cross-origin write checks, image uploads checked by file signature and stored under random names, security headers, prices always recalculated on the server from the database, and no secrets in code. Admin pages and every admin API route require the session.
- **Errors:** users see plain messages. Details are logged as JSON lines to stderr (capture them with systemd or your host).
- **Order links are secrets.** The order and invoice pages are reached by a long random link emailed or shown to the customer. There is no customer login. Transactional email is not built in, so connect an email service (for example to send the order link and invoice) before launch, or share the link on the confirmation page only.
- **Not built yet:** transactional email and SMS, per-item shipping weights or surcharges, a returns and refunds workflow (refunds are handled at your gateway), coupon codes, product reviews, and Postgres. The first run should also include a read-through of the policies page with your own terms.
- **Legal:** the site follows the visible requirements of the Consumer Protection (E-Commerce) Rules, 2020 in spirit (seller details, grievance officer, price inclusive of taxes, country of origin, return terms) and uses a short privacy notice aligned with the Digital Personal Data Protection Act, 2023. This is not legal advice. Have the policies reviewed before launch.
- **Payment:** until a real gateway is plugged in, no real payments can be taken.
