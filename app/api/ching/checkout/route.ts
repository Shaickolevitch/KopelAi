import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createCustomer, createCheckoutSession, PLANS, type PlanKey } from '@/lib/ching';

export async function POST(request: NextRequest) {
  try {
    const { planKey, code }: { planKey: PlanKey; code?: string } = await request.json();
    if (!PLANS[planKey]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // The student rate is gated by a coupon code people request from us directly.
    // The valid code lives in STUDENT_COUPON_CODE (server-only env). Compared
    // case-insensitively; never expose the code to the client.
    if (planKey === 'student') {
      const valid = (process.env.STUDENT_COUPON_CODE ?? '').trim().toLowerCase();
      const given = (code ?? '').trim().toLowerCase();
      if (!valid || given !== valid) {
        return NextResponse.json({ error: 'invalid_student_code' }, { status: 403 });
      }
    }

    if (!process.env.CHING_SECRET_KEY) {
      return NextResponse.json({ error: 'CHING_SECRET_KEY not configured' }, { status: 500 });
    }

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
    if (!user || user.is_anonymous) {
      return NextResponse.json({ error: 'Must be signed in with email to subscribe' }, { status: 401 });
    }

    // Get or create the ching customer record
    const { data: profile, error: profileErr } = await supabase
      .from('user_profile')
      .select('ching_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: `user_profile select failed: ${profileErr.message}` }, { status: 500 });
    }

    let customerId: string = profile?.ching_customer_id;
    if (!customerId) {
      const customer = await createCustomer(user.email!, user.id);
      customerId = customer.id;
      // Write billing fields with the service role (clients can't write these anymore).
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: upsertErr } = await admin.from('user_profile').upsert({
        user_id: user.id,
        ching_customer_id: customerId,
      });
      if (upsertErr) {
        return NextResponse.json({ error: `user_profile upsert failed: ${upsertErr.message}` }, { status: 500 });
      }
    }

    const origin = request.headers.get('origin') ?? 'https://kopelai.app';
    const session = await createCheckoutSession({
      customerId,
      priceId: PLANS[planKey].priceId,
      successUrl: `${origin}/app/checkout/success`,
      cancelUrl: `${origin}/app/plan`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Checkout route failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
