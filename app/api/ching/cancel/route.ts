import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cancelSubscription } from '@/lib/ching';

export async function POST(request: NextRequest) {
  // Identify the signed-in user from cookies.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Service-role client for trusted reads/writes.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile } = await admin
    .from('user_profile')
    .select('ching_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  try {
    if (profile?.ching_subscription_id) {
      // Real subscription: tell Ching to stop renewing. Access stays until period end;
      // the webhook flips the tier to free when the period actually ends.
      await cancelSubscription(profile.ching_subscription_id);
      return NextResponse.json({ status: 'scheduled' });
    }

    // No Ching subscription (e.g. comped Pro): drop to free immediately.
    await admin.from('user_profile').update({ subscription_tier: 'free' }).eq('user_id', user.id);
    return NextResponse.json({ status: 'downgraded' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
