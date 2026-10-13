import { store, getSettings } from '@/lib/config';
import { rupees } from '@/lib/money';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shipping, returns and privacy' };
export default function Policies() {
  const s = getSettings(); const st = store();
  return (<div className="section" style={{ maxWidth: 760 }}><h1>Shipping, returns and privacy</h1>
    <h2>Shipping</h2><p>We deliver within India only. Shipping is {rupees(s.shippingFlatPaise)} per order, and free on orders of {rupees(s.freeShippingThresholdPaise)} and above. The shipping charge includes GST and is shown in your total before you pay. Ready pieces are packed and handed to the courier from Chennai. Made-to-order pieces show their dispatch date on the product page and in your cart.</p>
    <h2>Taxes and invoices</h2><p>All prices are in Indian Rupees and include GST. The rate for each product is shown on its page. A GST invoice is issued for every paid order and can be viewed or downloaded from your order page.</p>
    <h2>Returns and refunds</h2><p>Tell us within 7 days of delivery if a ready-made piece arrives damaged or not as described, with a photo, and we will replace it or refund it. Made-to-order and personalised pieces are made for you and cannot be returned unless faulty. Refunds go back to the original payment method.</p>
    <h2>Privacy</h2><p>We collect the details you give at checkout to deliver your order and issue your invoice. If personalised suggestions are on, we also keep a random visitor ID and a list of products you viewed or added to your cart on this site, only to suggest similar pieces. We never use it for anything else, never share it, and never combine it with other sites. Turn it off any time from the footer, which also erases it. Under the Digital Personal Data Protection Act you can ask us to access, correct or delete your data at {st.email}.</p>
    <h2>Grievance officer</h2><p>{st.grievanceName || 'Shop owner'}, {st.grievanceEmail}. {st.address}.</p></div>);
}
