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
    .select('user_id')
    .eq('ching_customer_id', chingCustomerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function handleSubscriptionActive(subscription: Record<string, unknown>) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id as string;
  const periodEnd = subscription.current_period_end as string | null;

  const userId = await findUserByCustomer(customerId);
  if (!userId) {
    console.error('Webhook: no user found for ching customer', customerId);
    return;
  }

  await adminSupabase().from('user_profile').upsert({
    user_id: userId,
    subscription_tier: 'pro',
    ching_subscription_id: subscriptionId,
    subscription_current_period_end: periodEnd ?? null,
  });
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
