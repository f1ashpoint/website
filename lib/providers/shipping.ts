// Shipping provider interface. Core checkout asks it for a quote, and (later) for shipments and labels.
import { getSettings } from '../config';

export interface ShipQuoteRequest { destState: string; pincode: string; itemsTotalPaise: number; weightGrams: number }
export interface ShipQuote { amountPaise: number; service: string; etaDays?: [number, number] }
export interface ShipmentRequest { orderNumber: string; name: string; phone: string; address: string; pincode: string; state: string; weightGrams: number; items: { name: string; qty: number }[] }
export interface Shipment { awb: string; labelUrl?: string; trackingUrl?: string }
export interface ShippingProvider {
  id: string;
  /** Rate for a below-threshold order. The free-shipping threshold itself is applied by core checkout. */
  quote(req: ShipQuoteRequest): Promise<ShipQuote>;
  serviceable?(pincode: string): Promise<boolean>;
  createShipment?(req: ShipmentRequest): Promise<Shipment>;
}

export const flatRateShipping: ShippingProvider = {
  id: 'flat',
  async quote() { return { amountPaise: getSettings().shippingFlatPaise, service: 'Standard courier', etaDays: [4, 8] }; },
  async serviceable(pincode) { return /^[1-9][0-9]{5}$/.test(pincode); },
};

const registry: Record<string, () => ShippingProvider> = { flat: () => flatRateShipping };
/** Register an aggregator: registerShippingProvider('shiprocket', () => shiprocketProvider). Then set SHIPPING_PROVIDER=shiprocket. */
export function registerShippingProvider(id: string, factory: () => ShippingProvider) { registry[id] = factory; }
export function getShippingProvider(): ShippingProvider {
  const id = process.env.SHIPPING_PROVIDER || 'flat';
  const f = registry[id];
  if (!f) throw new Error(`Unknown SHIPPING_PROVIDER "${id}"`);
  return f();
}
