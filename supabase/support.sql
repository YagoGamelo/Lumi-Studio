-- LUMI Atendimento: executar uma vez no Supabase SQL Editor (migração ADICIONAL).
-- Nunca voltar a executar supabase/schema.sql nesta fase.
create extension if not exists pgcrypto;

create table if not exists public.support_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 bot_id uuid references public.bots(id) on delete set null,
 public_token text not null unique default encode(gen_random_bytes(24),'hex'),
 business_name text not null default 'A minha loja',
 knowledge text not null default '',
 welcome text not null default 'Olá! Como podemos ajudar?',
 enabled boolean not null default false,
 auto_reply boolean not null default true,
 updated_at timestamptz not null default now(),
 constraint support_token_safe check(public_token ~ '^[a-f0-9]{48}$'),
 constraint support_business_len check(char_length(business_name) between 2 and 90),
 constraint support_knowledge_len check(char_length(knowledge)<=3500)
);
alter table public.support_profiles enable row level security;
drop policy if exists support_profiles_owner on public.support_profiles;
create policy support_profiles_owner on public.support_profiles
 for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.support_profiles to authenticated;

create table if not exists public.support_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),
 customer_name text not null default 'Cliente',
 channel text not null default 'website' check(channel in ('website','sms','whatsapp')),
 customer_reference_hash text,
 customer_last4 text,
 status text not null default 'open' check(status in ('open','needs_human','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint support_customer_length check(char_length(customer_name) between 1 and 70)
);
create index if not exists support_conv_owner_idx
 on public.support_conversations(user_id,updated_at desc);
create index if not exists support_conv_external_idx
 on public.support_conversations(user_id,channel,customer_reference_hash);
alter table public.support_conversations enable row level security;
drop policy if exists support_conversations_owner on public.support_conversations;
create policy support_conversations_owner on public.support_conversations
 for select to authenticated using(user_id=auth.uid());
-- Apenas APIs server-side podem inserir/atualizar conversas após validar o acesso.
revoke insert,update,delete on public.support_conversations from authenticated,anon;
grant select on public.support_conversations to authenticated;

create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.support_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('customer','bot','human')),
 body text not null check(char_length(body) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index if not exists support_messages_conv_idx
 on public.support_messages(conversation_id,created_at);
alter table public.support_messages enable row level security;
drop policy if exists support_messages_owner on public.support_messages;
create policy support_messages_owner on public.support_messages
 for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.support_messages from authenticated,anon;
grant select on public.support_messages to authenticated;

create table if not exists public.support_calls (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 call_sid text unique,
 caller_last4 text,
 direction text not null default 'inbound' check(direction in ('inbound','outbound')),
 status text not null default 'received' check(status in ('received','answered','missed','completed','escalated')),
 duration_seconds int check(duration_seconds between 0 and 86400),
 consent_to_transcribe boolean not null default false,
 summary text not null default '',
 source text not null default 'manual' check(source in ('manual','twilio')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint support_call_note_size check(char_length(summary)<=2000)
);
create index if not exists support_calls_owner_idx
 on public.support_calls(user_id,created_at desc);
alter table public.support_calls enable row level security;
drop policy if exists support_calls_owner on public.support_calls;
create policy support_calls_owner on public.support_calls
 for select to authenticated using(user_id=auth.uid());
-- Informação de chamadas é manipulada pela API autenticada ou por webhooks Twilio validados.
revoke insert,update,delete on public.support_calls from authenticated,anon;
grant select on public.support_calls to authenticated;
