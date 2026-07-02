import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Keep in sync with the client-side gate in app/app/admin/page.tsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shaigian1@gmail.com';

// Verify the caller is the admin, server-side (cookie session). Returns the user
// or null.
async function requireAdmin() {
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
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// Service-role client for the trusted read/write of app_settings.
function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const isOn = (v: string | null | undefined) => {
  const s = (v ?? '').toLowerCase();
  return s === 'on' || s === '1' || s === 'true';
};

// Current maintenance state (for the admin UI to reflect on load).
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await adminDb()
    .from('app_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
  return NextResponse.json({ enabled: isOn(data?.value) });
}

// Toggle maintenance on/off. proxy.ts picks up the change within its ~10s cache.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const enabled = Boolean(body.enabled);

  const { error } = await adminDb().from('app_settings').upsert({
    key: 'maintenance_mode',
    value: enabled ? 'on' : 'off',
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('Maintenance toggle failed', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ enabled });
}
