-- Migration ADICIONAL. Executar no Supabase SQL Editor depois de schema.sql.
-- Limite atómico por utilizador: 20 tentativas de IA por dia UTC, incluindo planeamento.
-- Não guarda prompts, respostas, tokens nem chaves dos fornecedores.
create table if not exists public.lumi_ai_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 requests integer not null default 0 check(requests between 0 and 100000),
 primary key(user_id,day)
);
alter table public.lumi_ai_daily_usage enable row level security;
drop policy if exists lumi_ai_usage_owner_select on public.lumi_ai_daily_usage;
create policy lumi_ai_usage_owner_select on public.lumi_ai_daily_usage
 for select to authenticated using(user_id=auth.uid());
revoke all on public.lumi_ai_daily_usage from anon,authenticated;
grant select on public.lumi_ai_daily_usage to authenticated;

create or replace function public.lumi_consume_ai_quota() returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare who uuid := auth.uid();
declare new_count integer;
begin
 if who is null then return false; end if;
 insert into public.lumi_ai_daily_usage as existing(user_id,day,requests)
 values(who,(now() at time zone 'UTC')::date,1)
 on conflict(user_id,day) do update
 set requests=existing.requests+1
 where existing.requests<20
 returning requests into new_count;
 return new_count is not null;
end;$$;
revoke all on function public.lumi_consume_ai_quota() from public,anon;
grant execute on function public.lumi_consume_ai_quota() to authenticated;
