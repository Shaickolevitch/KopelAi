-- kopelai / kopelai.com (project ref: yxioeeuzhdknhpbjjzgq)
-- Per-day, per-user, per-model token accounting so real LLM cost is visible
-- (especially Pro volume + deep-model routing). Written fire-and-forget by the
-- backend after each chat completion via bump_token_usage().
create table if not exists public.token_usage_daily (
  day               date   not null default (now() at time zone 'utc')::date,
  user_id           uuid   not null references public.profiles(id) on delete cascade,
  model             text   not null,
  input_tokens      bigint not null default 0,
  output_tokens     bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  requests          integer not null default 0,
  primary key (day, user_id, model)
);

alter table public.token_usage_daily enable row level security;
-- Service-role only (backend writes); RLS on with no policy = deny-all to
-- PostgREST, same locked pattern as daily_usage/admin_events.

create or replace function public.bump_token_usage(
  p_user uuid, p_model text, p_in bigint, p_out bigint, p_cache bigint
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.token_usage_daily
    (day, user_id, model, input_tokens, output_tokens, cache_read_tokens, requests)
  values
    ((now() at time zone 'utc')::date, p_user, coalesce(nullif(p_model, ''), 'unknown'),
     coalesce(p_in, 0), coalesce(p_out, 0), coalesce(p_cache, 0), 1)
  on conflict (day, user_id, model) do update set
    input_tokens      = token_usage_daily.input_tokens      + excluded.input_tokens,
    output_tokens     = token_usage_daily.output_tokens     + excluded.output_tokens,
    cache_read_tokens = token_usage_daily.cache_read_tokens + excluded.cache_read_tokens,
    requests          = token_usage_daily.requests          + 1;
end $$;

revoke execute on function public.bump_token_usage(uuid, text, bigint, bigint, bigint) from public, anon, authenticated;
grant  execute on function public.bump_token_usage(uuid, text, bigint, bigint, bigint) to service_role;
