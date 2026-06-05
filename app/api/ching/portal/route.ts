import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createBillingPortalSession } from '@/lib/ching';

export async function POST(request: NextRequest) {
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

  const { data: profile } = await supabase
    .from('user_profile')
    .select('ching_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.ching_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const origin = request.headers.get('origin') ?? 'https://kopelai.app';
  const session = await createBillingPortalSession(
    profile.ching_customer_id,
    `${origin}/app/plan`
  );

  return NextResponse.json({ url: session.url });
}
