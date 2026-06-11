import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'pro';

// Module-level cache so we don't re-fetch on every render within the same session.
let _cachedTier: SubscriptionTier | null = null;
let _cachedUserId: string | null = null;

export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  if (_cachedTier && _cachedUserId === userId) return _cachedTier;
  const { data } = await supabase()
    .from('user_profile')
    .select('subscription_tier, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();
  let tier: SubscriptionTier = data?.subscription_tier === 'pro' ? 'pro' : 'free';

  // While the opt-in trial is active, treat the user as Pro so paid features
  // work. The backend is the real gate; this just drives UI behavior.
  if (tier === 'free' && data?.trial_ends_at && Date.now() < new Date(data.trial_ends_at).getTime()) {
    tier = 'pro';
  }

  _cachedTier = tier;
  _cachedUserId = userId;
  return tier;
}

export function invalidateSubscriptionCache() {
  _cachedTier = null;
  _cachedUserId = null;
}

// Called on conversation page init for free users — wipes the previous session's rows.
// Does NOT touch user_profile (to preserve ching_customer_id etc.).
export async function clearPreviousSession(userId: string) {
  const sb = supabase();
  const tables = [
    'insights',
    'themes',
    'messages',
    'conversations',
  ] as const;
  for (const table of tables) {
    const { error } = await sb.from(table).delete().eq('user_id', userId);
    if (error) console.error(`clearPreviousSession: failed on ${table}:`, error);
  }
}

// Starts the ching checkout flow: POSTs to our API route and redirects the browser.
// `couponCode` (optional) is passed to Ching to apply a discount (e.g. the
// student coupon people request from us) to the chosen plan.
export async function startCheckout(planKey: 'monthly' | 'annual', couponCode?: string) {
  const res = await fetch('/api/ching/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planKey, couponCode }),
  });
  if (!res.ok) {
    let text = await res.text();
    try { text = JSON.parse(text).error ?? text; } catch {}
    throw new Error(text || `Checkout failed`);
  }
  const { url } = await res.json();
  if (!url) throw new Error('No checkout URL returned');
  window.location.href = url;
}

// One-click cancel: stops renewal at Ching (or drops a comped account to free now).
export async function cancelSubscription(): Promise<{ status: 'scheduled' | 'downgraded' }> {
  const res = await fetch('/api/ching/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cancel failed: ${text}`);
  }
  return res.json();
}

// Opens the ching billing portal so the user can manage/cancel their subscription.
export async function openBillingPortal() {
  const res = await fetch('/api/ching/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Portal failed: ${text}`);
  }
  const { url } = await res.json();
  if (!url) throw new Error('No portal URL returned');
  window.location.href = url;
}
