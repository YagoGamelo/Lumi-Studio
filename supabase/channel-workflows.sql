-- LUMI: protótipos de projetos por WhatsApp + agenda de medicação com confirmação.
-- MIGRAÇÃO ADICIONAL. Executar depois de support.sql e whatsapp-free-replies.sql.
-- Não executar novamente schema.sql. Health processing DESATIVADO até autorização expressa.
create table if not exists public.support_channel_sessions (
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in ('whatsapp','sms')),
 sender_hash text not null check(sender_hash ~ '^[a-f0-9]{64}$'),
 topic text not null default 'general' check(topic in ('general','project','medication')),
 media_opt_in boolean not null default false,
 health_opt_in boolean not null default false,
 pending jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,channel,sender_hash)
);
alter table public.support_channel_sessions enable row level security;
revoke all on public.support_channel_sessions from anon,authenticated;

create table if not exists public.support_agent_artifacts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 sender_hash text not null check(sender_hash ~ '^[a-f0-9]{64}$'),
 channel text not null check(channel in ('whatsapp','sms')),
 kind text not null check(kind in ('project_draft','medication_calendar')),
 body text not null check(char_length(body) between 1 and 30000),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '48 hours')
);
create index if not exists support_agent_artifacts_expires_idx
 on public.support_agent_artifacts(expires_at);
alter table public.support_agent_artifacts enable row level security;
revoke all on public.support_agent_artifacts from anon,authenticated;

create table if not exists public.support_textbee_inbound_ids(
 id text primary key check(char_length(id) between 5 and 150),
 user_id uuid not null references auth.users(id) on delete cascade,
 received_at timestamptz not null default now()
);
alter table public.support_textbee_inbound_ids enable row level security;
revoke all on public.support_textbee_inbound_ids from anon,authenticated;

-- Opcional: chamar este comando periodicamente pela administração.
create or replace function public.cleanup_support_agent_expired()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 delete from public.support_agent_artifacts where expires_at<now();
 get diagnostics n=row_count;
 delete from public.support_channel_sessions where updated_at<now()-interval '30 days';
 delete from public.support_textbee_inbound_ids where received_at<now()-interval '30 days';
 delete from public.support_meta_inbound_ids where received_at<now()-interval '30 days';
 return n;
end; $$;
revoke all on function public.cleanup_support_agent_expired() from public,anon,authenticated;
grant execute on function public.cleanup_support_agent_expired() to service_role;

-- Custos: reserva atómica para responder a SMS (contabiliza envios automáticos locais).
-- Não consegue contabilizar SMS enviados manualmente no Android; configurar o tarifário.
create table if not exists public.support_sms_reply_budgets(
 day_utc date primary key,
 month_utc text not null,
 attempts int not null default 0 check(attempts>=0)
);
alter table public.support_sms_reply_budgets enable row level security;
revoke all on public.support_sms_reply_budgets from anon,authenticated;
create or replace function public.reserve_support_sms_reply(p_day_cap integer default 5,p_month_cap integer default 30)
returns boolean language plpgsql security definer set search_path=public as $$
declare today date:=(now() at time zone 'UTC')::date;
declare month_key text:=to_char(now() at time zone 'UTC','YYYY-MM');
declare month_total integer;
declare day_total integer;
begin
 if p_day_cap<1 or p_day_cap>20 or p_month_cap<1 or p_month_cap>200 then return false; end if;
 perform pg_advisory_xact_lock(5130929);
 select coalesce(sum(attempts),0) into month_total
 from public.support_sms_reply_budgets where month_utc=month_key;
 if month_total>=p_month_cap then return false; end if;
 insert into public.support_sms_reply_budgets(day_utc,month_utc,attempts) values(today,month_key,0)
 on conflict(day_utc) do nothing;
 update public.support_sms_reply_budgets set attempts=attempts+1
 where day_utc=today and attempts<p_day_cap returning attempts into day_total;
 return day_total is not null;
end; $$;
revoke all on function public.reserve_support_sms_reply(integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_support_sms_reply(integer,integer) to service_role;
