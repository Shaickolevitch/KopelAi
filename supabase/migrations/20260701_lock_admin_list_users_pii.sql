-- kopelai / kopelai.com (project ref: yxioeeuzhdknhpbjjzgq)
-- admin_list_users(...) is a LANGUAGE sql SECURITY DEFINER function returning every user's
-- email/tier/marketing-consent with NO internal admin check. It was executable by anon +
-- authenticated => anyone with the anon key could dump all users' PII via /rest/v1/rpc.
-- It is called only server-side via service_role (backend/src/index.ts, gated by an admin token).
revoke execute on function public.admin_list_users(text, text, integer, integer, text, text) from public, anon, authenticated;
grant  execute on function public.admin_list_users(text, text, integer, integer, text, text) to service_role;

-- The many "RLS enabled, no policy" tables (kb_chunks, kb_documents, daily_usage, telegram_*,
-- whatsapp_*, referrals, reviews, feedback, admin_events) are deny-all to PostgREST; the app
-- writes them via the service_role backend, so this is the correct locked state. Left as-is.
-- vector-extension-in-public is low-priority hygiene (left as-is).
