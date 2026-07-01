import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/ching';

// Lazy - createClient runs at request time, not build time, so the
// service role key is available when it's actually needed.
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('ching-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { id?: string; type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Malformed body: 400 (not 500) so Ching doesn't hammer us with retries.
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id: eventId, type, data } = event;

  // Idempotency: Ching retries any non-2xx and can deliver duplicates. Claim the
  // event id up-front via a UNIQUE column — a concurrent/duplicate delivery loses
  // the insert (23505) and short-circuits, closing the double-reward race.
  if (eventId) {
    const { error: dupErr } = await adminSupabase()
      .from('processed_webhook_events')
      .insert({ event_id: eventId });
    if (dupErr) {
      if (dupErr.code === '23505') {
        // Already processed — ack with 200 so Ching stops retrying.
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Dedup infra error (e.g. table missing): log and fall through rather than
      // drop a real event. The per-handler guards remain the safety net.
      console.error('Webhook: dedup insert failed', dupErr);
    }
  }

  if (type === 'subscription.created' || type === 'subscription.updated') {
    await handleSubscriptionActive(data as Record<string, unknown>);
  } else if (type === 'subscription.canceled') {
    await handleSubscriptionCanceled(data as Record<string, unknown>);
  } else if (type === 'subscription.past_due') {
    await handleSubscriptionPastDue(data as Record<string, unknown>);
  }

  return NextResponse.json({ received: true });
}

// Server-side PostHog capture. The client can't see the conversion (it happens
// on Ching's side + this webhook), so paid conversion is invisible to the funnel
// unless we emit it here. No cookies, keyed by user id. Best-effort — never throws.
async function capturePurchase(userId: string, props: Record<string, unknown>) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_xY6frLwx3HE9MepYsRoo7WWstaoZrknK4fYfDWWkjTEx';
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
  if (!key) return;
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, event: 'purchase', distinct_id: userId, properties: props }),
    });
  } catch (e) {
    console.error('Webhook: PostHog purchase capture failed', e);
  }
}

async function findUserByCustomer(chingCustomerId: string) {
  const { data } = await adminSupabase()
    .from('user_profile')
    .select('user_id, subscription_tier')
    .eq('ching_customer_id', chingCustomerId)
    .maybeSingle();
  return data ? { userId: data.user_id as string, tier: data.subscription_tier as string | null } : null;
}

async function handleSubscriptionActive(subscription: Record<string, unknown>) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id as string;
  const periodEnd = subscription.current_period_end as string | null;

  const found = await findUserByCustomer(customerId);
  if (!found) {
    console.error('Webhook: no user found for ching customer', customerId);
    return;
  }
  const { userId, tier: prevTier } = found;

  await adminSupabase().from('user_profile').upsert({
    user_id: userId,
    subscription_tier: 'pro',
    ching_subscription_id: subscriptionId,
    subscription_current_period_end: periodEnd ?? null,
  });

  // Notify the admin + reward a referrer only on a real free→pro conversion.
  if (prevTier !== 'pro') {
    // Funnel: fire the paid-conversion event (only on a genuine free→pro flip,
    // so renewals/updates don't double-count).
    await capturePurchase(userId, {
      plan: (subscription.plan as string) ?? null,
      ching_subscription_id: subscriptionId,
    });

    try {
      const admin = adminSupabase();
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const email = authUser?.user?.email ?? 'משתמש';
      await admin.from('admin_events').insert({ type: 'pro_purchase', title: email });
    } catch (e) {
      console.error('Webhook: failed to log pro_purchase event', e);
    }

    // "Give a month, get a month": if this buyer was referred, grant the
    // referrer 30 days of comped Pro (stacking) and mark the referral rewarded.
    try {
      const admin = adminSupabase();
      const { data: ref } = await admin
        .from('referrals').select('id, referrer_id, status').eq('referee_id', userId).maybeSingle();
      if (ref && ref.status === 'pending') {
        await admin.from('referrals').update({ status: 'rewarded', rewarded_at: new Date().toISOString() }).eq('id', ref.id);
        const { data: rp } = await admin
          .from('user_profile').select('referral_pro_until').eq('user_id', ref.referrer_id).maybeSingle();
        const cur = rp?.referral_pro_until ? new Date(rp.referral_pro_until).getTime() : 0;
        const base = cur > Date.now() ? cur : Date.now();
        const until = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
        await admin.from('user_profile').upsert({ user_id: ref.referrer_id, referral_pro_until: until });
        await admin.from('admin_events').insert({ type: 'referral_reward', title: 'חבר שהוזמן הפך לפרו 🎁' });
        // Tree: a referral converting earns the inviter a collectible drop (+10),
        // tapped on their Invite page (if they have a tree planted).
        const { data: tr } = await admin.from('tree_state').select('user_id').eq('user_id', ref.referrer_id).maybeSingle();
        if (tr) {
          await admin.from('water_rewards').insert({
            user_id: ref.referrer_id, amount: 10, source: 'referral', route: '/app/invite',
            label_he: 'חבר שהצטרף 🎁', label_en: 'A friend joined 🎁',
          });
        }
      }
    } catch (e) {
      console.error('Webhook: referral reward failed', e);
    }
  }
}

async function handleSubscriptionCanceled(subscription: Record<string, unknown>) {
  const customerId = subscription.customer as string;
  const found = await findUserByCustomer(customerId);
  if (!found) return;

  await adminSupabase().from('user_profile').upsert({
    user_id: found.userId,
    subscription_tier: 'free',
    ching_subscription_id: null,
    subscription_current_period_end: null,
  });
}

async function handleSubscriptionPastDue(subscription: Record<string, unknown>) {
  // Keep pro access until the period truly ends; just log.
  const customerId = subscription.customer as string;
  console.warn('Subscription past due for ching customer', customerId);
}
