import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton browser client (keep one per app session)
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function supabase() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}