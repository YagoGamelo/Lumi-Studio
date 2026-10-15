-- LUMI Bot Alerts — migração adicional, correr no Supabase SQL Editor.
-- Não executar novamente o ficheiro schema.sql.
create table if not exists public.bot_alert_phones (
 user_id uuid primary key references auth.users(id) on delete cascade,
 phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 verified_at timestamptz,
 verification_requested_at timestamptz,
 attempts_day date not null default (now() at time zone 'UTC')::date,
 attempts_today int not null default 0 check(attempts_today between 0 and 20)
);
alter table public.bot_alert_phones enable row level security;
drop policy if exists bot_alert_phones_owner_read on public.bot_alert_phones;
create policy bot_alert_phones_owner_read on public.bot_alert_phones
 for select to authenticated using(user_id=auth.uid());
-- Sem política INSERT/UPDATE/DELETE: verificação apenas por API server-side com service_role.
revoke insert,update,delete on public.bot_alert_phones from authenticated,anon;
grant select on public.bot_alert_phones to authenticated;

create table if not exists public.bot_alert_schedules (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bot_id uuid not null references public.bots(id) on delete cascade,
 channel text not null check(channel in ('inapp','sms','whatsapp')),
 time_local text not null check(time_local ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 timezone text not null default 'Europe/Lisbon',
 recurrence text not null check(recurrence in ('daily','weekdays','weekly')),
 weekday int check(weekday between 0 and 6),
 message text not null check(char_length(message) between 5 and 450),
 whatsapp_opt_in boolean not null default false,
 enabled boolean not null default true,
 next_run_at timestamptz not null,
 claim_until timestamptz,
 last_run_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 constraint bot_alert_whatsapp_consent check(channel <> 'whatsapp' or whatsapp_opt_in=true)
);
create index if not exists bot_alert_due_idx
 on public.bot_alert_schedules (next_run_at) where enabled=true;
create index if not exists bot_alert_owner_idx
 on public.bot_alert_schedules (user_id);
alter table public.bot_alert_schedules enable row level security;
drop policy if exists bot_alert_schedules_owner on public.bot_alert_schedules;
create policy bot_alert_schedules_owner on public.bot_alert_schedules
 for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Access is column restricted: users cannot move a job to "now" or bypass its claim lease.
revoke insert,update,delete on public.bot_alert_schedules from authenticated,anon;
grant select,delete on public.bot_alert_schedules to authenticated;
grant insert (user_id,bot_id,channel,time_local,timezone,recurrence,weekday,message,whatsapp_opt_in,enabled,next_run_at) on public.bot_alert_schedules to authenticated;
grant update (enabled) on public.bot_alert_schedules to authenticated;

create or replace function public.check_bot_alert_owner() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.bots where id=new.bot_id and user_id=new.user_id) then
  raise exception 'Bot não pertence à conta';
 end if;
 return new;
end $$;
drop trigger if exists bot_alert_owner_trigger on public.bot_alert_schedules;
create trigger bot_alert_owner_trigger before insert or update of bot_id,user_id on public.bot_alert_schedules
 for each row execute function public.check_bot_alert_owner();

create table if not exists public.bot_alert_inbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 schedule_id uuid references public.bot_alert_schedules(id) on delete set null,
 delivery_key text not null unique,
 bot_title text not null,
 content text not null,
 channel text not null,
 delivered_at timestamptz not null default now(),
 provider_status text not null default 'inapp'
);
create index if not exists bot_alert_inbox_user_idx
 on public.bot_alert_inbox (user_id,delivered_at desc);
alter table public.bot_alert_inbox enable row level security;
drop policy if exists bot_alert_inbox_owner on public.bot_alert_inbox;
create policy bot_alert_inbox_owner on public.bot_alert_inbox
 for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.bot_alert_inbox from authenticated,anon;
grant select on public.bot_alert_inbox to authenticated;

-- Atomic lease: permite concorrência segura entre workers sem ler dados de outros utilizadores.
create or replace function public.claim_due_bot_alerts(batch_limit integer default 10)
returns setof public.bot_alert_schedules
language sql security definer set search_path=public
as $$
 with pending as (
  select id from public.bot_alert_schedules
  where enabled=true and next_run_at<=now()
   and (claim_until is null or claim_until<now())
  order by next_run_at
  for update skip locked
  limit least(greatest(batch_limit,1),20)
 )
 update public.bot_alert_schedules s
 set claim_until=now()+interval '4 minutes'
 from pending p where s.id=p.id
 returning s.*;
$$;
revoke all on function public.claim_due_bot_alerts(integer) from public,anon,authenticated;
grant execute on function public.claim_due_bot_alerts(integer) to service_role;
