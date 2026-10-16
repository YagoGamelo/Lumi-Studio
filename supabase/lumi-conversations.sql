-- LUMI AI: saved conversation history (ADDITIONAL migration).
-- Separate from personal knowledge and world learning. No training on chats.
create table if not exists public.lumi_ai_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Nova conversa'
   check (char_length(title) between 1 and 100),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create index if not exists lumi_ai_conversations_owner_recent
 on public.lumi_ai_conversations(user_id,updated_at desc);
alter table public.lumi_ai_conversations enable row level security;
drop policy if exists lumi_ai_conversations_owner_select on public.lumi_ai_conversations;
drop policy if exists lumi_ai_conversations_owner_insert on public.lumi_ai_conversations;
drop policy if exists lumi_ai_conversations_owner_update on public.lumi_ai_conversations;
drop policy if exists lumi_ai_conversations_owner_delete on public.lumi_ai_conversations;
create policy lumi_ai_conversations_owner_select on public.lumi_ai_conversations
 for select to authenticated using(user_id=auth.uid());
create policy lumi_ai_conversations_owner_insert on public.lumi_ai_conversations
 for insert to authenticated with check(user_id=auth.uid());
create policy lumi_ai_conversations_owner_update on public.lumi_ai_conversations
 for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy lumi_ai_conversations_owner_delete on public.lumi_ai_conversations
 for delete to authenticated using(user_id=auth.uid());
revoke all on public.lumi_ai_conversations from anon,authenticated;
grant select,insert,delete on public.lumi_ai_conversations to authenticated;
-- Ownership and title/timestamp updates are managed by the server route.
grant update(title,updated_at) on public.lumi_ai_conversations to authenticated;

create table if not exists public.lumi_ai_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('user','assistant')),
 content text not null check (char_length(content) between 1 and 14000),
 created_at timestamptz not null default now(),
 foreign key (conversation_id,user_id)
   references public.lumi_ai_conversations(id,user_id) on delete cascade
);
create index if not exists lumi_ai_messages_thread
 on public.lumi_ai_messages(conversation_id,created_at,id);
alter table public.lumi_ai_messages enable row level security;
drop policy if exists lumi_ai_messages_owner_select on public.lumi_ai_messages;
drop policy if exists lumi_ai_messages_owner_insert on public.lumi_ai_messages;
create policy lumi_ai_messages_owner_select on public.lumi_ai_messages
 for select to authenticated using(user_id=auth.uid());
create policy lumi_ai_messages_owner_insert on public.lumi_ai_messages
 for insert to authenticated with check(user_id=auth.uid());
revoke all on public.lumi_ai_messages from anon,authenticated;
grant select,insert on public.lumi_ai_messages to authenticated;
-- Messages are immutable; deleting a conversation cascades to its messages.

-- Ownership is guaranteed by RLS and composite foreign key. Neither notes nor
-- conversations are ingested into the shared world index or model training.
-- History is sent only to the inference provider selected for that specific
-- authenticated response. Do not store API keys or sensitive information.
