import crypto from 'crypto';

const BASE = 'https://api.ching.co.il/ching/v1';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.CHING_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function chingFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  // Ching wraps responses as { success: boolean, data?: ..., error?: ... }.
  if (!res.ok || !json.success) {
    const errMsg = json.error
      ? (typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      : `HTTP ${res.status}`;
    throw new Error(`Ching ${path} failed: ${errMsg}`);
  }
  return json.data;
}

export async function createCustomer(email: string, userId: string, name?: string) {
  // Ching requires `name`. Fall back to the email local-part if no name is given.
  const fallbackName = email.split('@')[0] ?? 'User';
  return chingFetch('/customers', {
    name: name ?? fallbackName,
    email,
    metadata: { user_id: userId },
  });
}

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return chingFetch('/checkout_sessions', {
    customer: customerId,
    price: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return chingFetch('/billing_portal_sessions', { customer: customerId, return_url: returnUrl });
}

// Cancel at period end: subscription stays active until the paid period ends, then won't renew.
export async function cancelSubscription(subscriptionId: string) {
  return chingFetch(`/subscriptions/${subscriptionId}/cancel`, { cancel_at_period_end: true });
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.CHING_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}

// Pricing: ₪99/mo, ₪990/yr. `regularNis` is the HONEST reference price only —
// for annual it's the genuine monthly-paid equivalent (12 × ₪99 = ₪1,188), used
// to show real annual savings. Never display a reference price that was never
// actually charged (Israeli/EU consumer law treats fabricated anchors as
// deceptive). Monthly has no prior price, so regularNis === nis.
export const PLANS = {
  monthly: { priceId: 'price_6JY_rosMd47o', nis: 99, usd: 99, regularNis: 99 },
  annual:  { priceId: 'price_e5Z00_n0qYO9', nis: 990, usd: 990, regularNis: 1188 },
  // Student/trainee rate. Not shown publicly — unlocked with a coupon code that
  // people request from Shai/Kopel directly (see the checkout route's code gate).
  student: { priceId: 'price_HAXqCp2o4kbM', nis: 39, usd: 39, regularNis: 99 },
} as const;

export type PlanKey = keyof typeof PLANS;
