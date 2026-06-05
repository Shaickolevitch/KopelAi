-- KopelAi database schema — replicated from Zotani's structure (2026-06-05).
-- Applied to the KopelAi Supabase project (separate from Zotani).

-- ─── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  preferred_language text not null default 'he' check (preferred_language in ('he','en')),
  tier               text not null default 'free' check (tier in ('free','paid')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  language      text not null default 'he' check (language in ('he','en')),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  summary       text,
  message_count integer not null default 0,
  deleted_at    timestamptz
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  language        text not null default 'he' check (language in ('he','en')),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table if not exists public.user_profile (
  user_id                          uuid primary key references public.profiles(id) on delete cascade,
  profile_data                     jsonb not null default '{}'::jsonb,
  prompt_summary                   text,
  last_updated_at                  timestamptz not null default now(),
  version                          integer not null default 1,
  display_opener                   text,
  deleted_at                       timestamptz,
  subscription_tier                text not null default 'free',
  ching_customer_id                text,
  ching_subscription_id            text,
  subscription_current_period_end  timestamptz
);

create table if not exists public.themes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text,
  status            text not null default 'open' check (status in ('open','exploring','resolved','dropped')),
  priority          integer not null default 5,
  first_observed_at timestamptz not null default now(),
  last_observed_at  timestamptz not null default now(),
  source_message_ids uuid[] default array[]::uuid[],
  deleted_at        timestamptz
);

create table if not exists public.insights (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  category           text not null,
  content            text not null,
  source_message_ids uuid[] not null default array[]::uuid[],
  confidence         integer not null default 5 check (confidence >= 1 and confidence <= 10),
  user_feedback      text check (user_feedback in ('confirmed','rejected','refined') or user_feedback is null),
  user_feedback_note text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- ─── Row-Level Security ──────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.user_profile  enable row level security;
alter table public.themes        enable row level security;
alter table public.insights      enable row level security;

-- profiles
create policy "read own profile"   on public.profiles for select using (auth.uid() = id and deleted_at is null);
create policy "update own profile" on public.profiles for update using (auth.uid() = id and deleted_at is null);

-- conversations
create policy "read own conversations"   on public.conversations for select using (auth.uid() = user_id and deleted_at is null);
create policy "insert own conversations" on public.conversations for insert with check (auth.uid() = user_id);
create policy "update own conversations" on public.conversations for update using (auth.uid() = user_id);
create policy "delete own conversations" on public.conversations for delete using (auth.uid() = user_id);

-- messages
create policy "read own messages"   on public.messages for select using (auth.uid() = user_id and deleted_at is null);
create policy "insert own messages" on public.messages for insert with check (auth.uid() = user_id);
create policy "update own messages" on public.messages for update using (auth.uid() = user_id);
create policy "delete own messages" on public.messages for delete using (auth.uid() = user_id);

-- user_profile
create policy "read own user_profile"   on public.user_profile for select using (auth.uid() = user_id and deleted_at is null);
create policy "insert own user_profile" on public.user_profile for insert with check (auth.uid() = user_id);
create policy "update own user_profile" on public.user_profile for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- themes
create policy "read own themes" on public.themes for select using (auth.uid() = user_id and deleted_at is null);

-- insights
create policy "read own insights"   on public.insights for select using (auth.uid() = user_id and deleted_at is null);
create policy "update own insights" on public.insights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own insights" on public.insights for delete using (auth.uid() = user_id);

-- ─── Functions (account lifecycle) ───────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create or replace function public.soft_delete_user(target_user_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.profiles      set deleted_at = now() where id = target_user_id and deleted_at is null;
  update public.conversations set deleted_at = now() where user_id = target_user_id and deleted_at is null;
  update public.messages      set deleted_at = now() where user_id = target_user_id and deleted_at is null;
  update public.user_profile  set deleted_at = now() where user_id = target_user_id and deleted_at is null;
  update public.themes        set deleted_at = now() where user_id = target_user_id and deleted_at is null;
  update public.insights      set deleted_at = now() where user_id = target_user_id and deleted_at is null;
end;
$$;

create or replace function public.restore_user(target_user_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if exists (
    select 1 from public.profiles
    where id = target_user_id and deleted_at is not null and deleted_at > now() - interval '7 days'
  ) then
    update public.profiles      set deleted_at = null where id = target_user_id;
    update public.conversations set deleted_at = null where user_id = target_user_id;
    update public.messages      set deleted_at = null where user_id = target_user_id;
    update public.user_profile  set deleted_at = null where user_id = target_user_id;
    update public.themes        set deleted_at = null where user_id = target_user_id;
    update public.insights      set deleted_at = null where user_id = target_user_id;
  else
    raise exception 'Restore failed: user not in restorable state';
  end if;
end;
$$;

create or replace function public.get_deletion_status(target_user_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  deletion_time timestamptz;
  result jsonb;
begin
  select deleted_at into deletion_time from public.profiles where id = target_user_id;
  if deletion_time is null then
    result := jsonb_build_object('is_deleted', false);
  else
    result := jsonb_build_object(
      'is_deleted', true,
      'deleted_at', deletion_time,
      'restorable', deletion_time > now() - interval '7 days',
      'days_remaining', greatest(0, extract(day from (deletion_time + interval '7 days' - now()))::int)
    );
  end if;
  return result;
end;
$$;

create or replace function public.purge_expired_deletions()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  expired_users uuid[];
  purged_count int;
begin
  select array_agg(id) into expired_users from public.profiles
  where deleted_at is not null and deleted_at < now() - interval '7 days';
  if expired_users is null or array_length(expired_users, 1) = 0 then
    return jsonb_build_object('purged', 0, 'users', '[]'::jsonb);
  end if;
  purged_count := array_length(expired_users, 1);
  delete from public.messages      where user_id = any(expired_users);
  delete from public.conversations where user_id = any(expired_users);
  delete from public.insights      where user_id = any(expired_users);
  delete from public.themes        where user_id = any(expired_users);
  delete from public.user_profile  where user_id = any(expired_users);
  delete from public.profiles      where id = any(expired_users);
  return jsonb_build_object('purged', purged_count, 'users', to_jsonb(expired_users));
end;
$$;

-- ─── Trigger: create a profile row on signup ─────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
