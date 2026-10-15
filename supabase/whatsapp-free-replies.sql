-- Respostas gratuitas limitadas de WhatsApp Business Cloud API (Meta).
-- Migração adicional, executar depois de support.sql.
-- O operador configura Meta Cloud API e limita o volume mensal para evitar custos.
-- O limite local não conhece tráfego WhatsApp enviado por outros sistemas!
create table if not exists public.support_meta_inbound_ids (
 id text primary key check(char_length(id) between 5 and 150),
 user_id uuid not null references auth.users(id) on delete cascade,
 received_at timestamptz not null default now()
);
create index if not exists support_meta_inbound_owner_idx
 on public.support_meta_inbound_ids(user_id,received_at);
alter table public.support_meta_inbound_ids enable row level security;
revoke all on public.support_meta_inbound_ids from anon,authenticated;

create table if not exists public.support_meta_reply_budgets (
 phone_number_id text not null,
 month_utc text not null check(month_utc ~ '^[0-9]{4}-[0-9]{2}$'),
 attempts int not null default 0 check(attempts >= 0),
 primary key(phone_number_id,month_utc)
);
alter table public.support_meta_reply_budgets enable row level security;
revoke all on public.support_meta_reply_budgets from anon,authenticated;

create or replace function public.reserve_meta_free_reply(
 p_phone_number_id text,p_month_utc text,p_limit integer
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare used integer;
begin
 if p_limit<1 or p_limit>1000 or p_month_utc <> to_char(now() at time zone 'UTC','YYYY-MM') then
  return false;
 end if;
 insert into public.support_meta_reply_budgets(phone_number_id,month_utc,attempts)
 values(p_phone_number_id,p_month_utc,0) on conflict do nothing;
 update public.support_meta_reply_budgets set attempts=attempts+1
 where phone_number_id=p_phone_number_id and month_utc=p_month_utc and attempts<p_limit
 returning attempts into used;
 return used is not null;
end;
$$;
revoke all on function public.reserve_meta_free_reply(text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_meta_free_reply(text,text,integer) to service_role;
