import { getSettings } from '@/lib/config';
import { rupees } from '@/lib/money';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Studio Circle rewards' };
export default function Loyalty() {
  const s = getSettings();
  return (<div className="section" style={{ maxWidth: 720 }}><h1>Studio Circle</h1>
    <p>Studio Circle is our optional rewards programme. Nobody is enrolled automatically. You join only by ticking the box at checkout, which is unticked by default. Shopping with us works exactly the same without it.</p>
    <h2>What members get</h2>
    <ul><li>Earn 1 point for every {rupees(s.loyaltyEarnPerRupees * 100)} spent on products, counted after payment is confirmed. Shipping is not counted.</li>
    <li>Each point is worth {rupees(s.loyaltyPointValuePaise)} off a later order. Points can cover up to {s.loyaltyMaxRedeemPct}% of the product total on one order.</li>
    <li>That is all. There are no tiers, no secret perks and no expiry that we have not told you about here. Points have no expiry unless we announce a change with at least 30 days notice.</li></ul>
    <h2>Your data</h2><p>We store your email, name and points balance for the programme. We do not sell it. Ask us to delete your membership at any time and we will, and any unused points will lapse.</p></div>);
}
