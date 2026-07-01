-- kopelai / kopelai.com (project ref: yxioeeuzhdknhpbjjzgq)
-- Pre-launch hardening: webhook idempotency + hot-path indexes.

-- 1) Idempotency ledger for Ching webhooks. The route claims event.id here up-front
--    (UNIQUE) so a duplicate/concurrent retry loses the insert and short-circuits,
--    closing the double-referral-reward race. Service-role only (RLS on, no policy —
--    same locked pattern as admin_events/referrals: deny-all to PostgREST, written
--    by the server via service_role).
create table if not exists public.processed_webhook_events (
  event_id     text primary key,
  processed_at timestamptz not null default now()
);
alter table public.processed_webhook_events enable row level security;

-- 2) Hot-path indexes. messages is read on nearly every bot turn by conversation_id
--    ordered by created_at (with a deleted_at IS NULL filter); without this it's a
--    full scan per reply and per idle sweep.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at)
  where deleted_at is null;

-- conversations is filtered by user_id for the "current open session" lookup and history.
create index if not exists conversations_user_ended_idx
  on public.conversations (user_id, ended_at)
  where deleted_at is null;

-- If the `channel` column exists (added post-schema.sql for Telegram/WhatsApp routing),
-- add a channel-aware index too. Guarded so the migration is safe either way.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'channel'
  ) then
    execute 'create index if not exists conversations_user_channel_open_idx
             on public.conversations (user_id, channel)
             where ended_at is null and deleted_at is null';
  end if;
end $$;
