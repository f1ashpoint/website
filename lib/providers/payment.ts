// Payment provider interface. Core checkout only talks to this. Add a gateway by implementing it and registering it below.
export interface PaymentRequest {
  orderNumber: string; orderToken: string; amountPaise: number; currency: 'INR';
  customer: { name: string; email: string; phone: string };
}
export interface PaymentSession { providerRef: string; action: { type: 'redirect'; url: string } }
export interface PaymentOutcome { orderToken: string; status: 'paid' | 'failed'; providerRef: string }
export interface PaymentProvider {
  id: string;
  createPayment(req: PaymentRequest): Promise<PaymentSession>;
  /** Verify a gateway callback or webhook (check signatures here) and return a normalised outcome. */
  verifyCallback(payload: unknown, headers?: Headers): Promise<PaymentOutcome>;
}

/** Sandbox provider. Never moves money. Disabled in production unless ALLOW_STUB_PAYMENTS=1. */
export const stubPayment: PaymentProvider = {
  id: 'stub',
  async createPayment(req) {
    return { providerRef: 'stub_' + req.orderNumber, action: { type: 'redirect', url: `/pay/${req.orderToken}` } };
  },
  async verifyCallback(payload) {
    const p = payload as { orderToken?: string; outcome?: string };
    if (!p?.orderToken || !['paid', 'failed'].includes(p.outcome || '')) throw new Error('Invalid stub payload');
    return { orderToken: p.orderToken, status: p.outcome as 'paid' | 'failed', providerRef: 'stub_' + p.orderToken.slice(0, 8) };
  },
};

const registry: Record<string, () => PaymentProvider> = { stub: () => stubPayment };
/** Register a real gateway: registerPaymentProvider('razorpay', () => razorpayProvider). Then set PAYMENT_PROVIDER=razorpay. */
export function registerPaymentProvider(id: string, factory: () => PaymentProvider) { registry[id] = factory; }
export function getPaymentProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER || 'stub';
  const f = registry[id];
  if (!f) throw new Error(`Unknown PAYMENT_PROVIDER "${id}"`);
  if (id === 'stub' && process.env.NODE_ENV === 'production' && process.env.ALLOW_STUB_PAYMENTS !== '1')
    throw new Error('The stub payment provider is disabled in production. Configure a real provider or set ALLOW_STUB_PAYMENTS=1 for a demo.');
  return f();
}
