-- Run AFTER schema.sql.
alter table public.bots add column if not exists next_run_at timestamptz;
alter table public.bots add column if not exists last_run_at timestamptz;
alter table public.bots add column if not exists schedule_hour_utc smallint check(schedule_hour_utc between 0 and 23);
alter table public.bots add column if not exists notify_email boolean not null default false;
create index if not exists bots_due_idx on public.bots(status,next_run_at) where status='active';

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('openai','heygen','newsapi','elevenlabs')),
  encrypted_value text not null,
  last_four text not null,
  created_at timestamptz default now() not null,
  unique(user_id,provider)
);
alter table public.user_api_keys enable row level security;
revoke all on public.user_api_keys from anon,authenticated;

-- A due job is claimed atomically before API calls. A failed run is logged and rescheduled.
create or replace function public.claim_due_bot_jobs(batch_size integer default 5)
returns table(id uuid,user_id uuid,title text,instruction text,category text,frequency text,notify_email boolean)
language plpgsql security definer set search_path=public as $$
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Server-only';
  end if;
  return query
  with due as (
    select b.id from public.bots b where b.status='active' and b.next_run_at<=now()
    order by b.next_run_at asc limit least(greatest(batch_size,1),10) for update skip locked
  ), moved as (
    update public.bots b set last_run_at=now(),
      next_run_at=now()+case when b.frequency='weekly' then interval '7 days' else interval '1 day' end
    from due where b.id=due.id
    returning b.id,b.user_id,b.title,b.instruction,b.category,b.frequency,b.notify_email
  )
  select moved.id,moved.user_id,moved.title,moved.instruction,moved.category,moved.frequency,moved.notify_email from moved;
end;
$$;
revoke execute on function public.claim_due_bot_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_due_bot_jobs(integer) to service_role;
