-- kopelai / kopelai.com (project ref: yxioeeuzhdknhpbjjzgq)
-- Runtime key/value settings, read by the edge middleware (proxy.ts) and written
-- by the admin-only /api/admin/maintenance route. Lets maintenance mode be
-- toggled without a redeploy.
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Public READ: the flag is not sensitive and the edge middleware reads it with
-- the anon key on every request. Writes stay service-role only (the admin API
-- route), so no write policy is granted here.
drop policy if exists "public read app_settings" on public.app_settings;
create policy "public read app_settings" on public.app_settings for select using (true);

-- Seed the maintenance flag ON, matching the current pre-launch state. The admin
-- toggle flips it to 'off' when you're ready to go live — no deploy needed.
insert into public.app_settings (key, value)
values ('maintenance_mode', 'on')
on conflict (key) do nothing;
