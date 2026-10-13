import { z } from 'zod';
import { INDIAN_STATES } from './config';

export const cartItemSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().min(1).max(50),
  engraving: z.string().trim().max(60).optional(),
});
export const cartSchema = z.array(cartItemSchema).max(40);

export const checkoutSchema = z.object({
  items: cartSchema.min(1, 'Your cart is empty.'),
  name: z.string().trim().min(2, 'Please enter your full name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  phone: z.string().trim().transform((s) => s.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '')).pipe(z.string().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number')),
  line1: z.string().trim().min(3, 'Enter your address').max(160),
  line2: z.string().trim().max(160).default(''),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  state: z.string().refine((s) => INDIAN_STATES.some((x) => x.name === s), 'Choose a state or union territory in India'),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code'),
  country: z.string().trim().default('India'),
  joinLoyalty: z.boolean().default(false),
  redeemPoints: z.number().int().min(0).max(100000).default(0),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
