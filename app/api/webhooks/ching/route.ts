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

  const event = JSON.parse(rawBody);
  const { type, data } = event;

  if (type === 'subscription.created' || type === 'subscription.updated') {
    await handleSubscriptionActive(data);
  } else if (type === 'subscription.canceled') {
    await handleSubscriptionCanceled(data);
  } else if (type === 'subscription.past_due') {
    await handleSubscriptionPastDue(data);
  }

  return NextResponse.json({ received: true });
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
        // Tree: a referral converting waters the inviter's tree (+10), if planted.
        const { data: tr } = await admin.from('tree_state').select('water_drops').eq('user_id', ref.referrer_id).maybeSingle();
        if (tr) {
          await admin.from('tree_state').update({ water_drops: (tr.water_drops ?? 0) + 10, updated_at: new Date().toISOString() }).eq('user_id', ref.referrer_id);
        }
      }
    } catch (e) {
      console.error('Webhook: referral reward failed', e);
    }
  }
}

async function handleSubscriptionCanceled(subscription: Record<string, unknown>) {
  const customerId = subscription.customer as string;
  const userId = await findUserByCustomer(customerId);
  if (!userId) return;

  await adminSupabase().from('user_profile').upsert({
    user_id: userId,
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
