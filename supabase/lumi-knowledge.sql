-- LUMI AI: personal knowledge library, strictly opt-in.
-- ADDITIONAL migration; keep existing Supabase tables.
-- Knowledge items are NOT model training data and never auto-learn from chats.
create table if not exists public.lumi_knowledge (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 80),
 content text not null check (char_length(content) between 10 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists lumi_knowledge_owner_idx
 on public.lumi_knowledge(user_id,created_at desc);
alter table public.lumi_knowledge enable row level security;
drop policy if exists lumi_knowledge_select on public.lumi_knowledge;
drop policy if exists lumi_knowledge_insert on public.lumi_knowledge;
drop policy if exists lumi_knowledge_delete on public.lumi_knowledge;
create policy lumi_knowledge_select on public.lumi_knowledge
 for select to authenticated using(user_id=auth.uid());
create policy lumi_knowledge_insert on public.lumi_knowledge
 for insert to authenticated with check(user_id=auth.uid());
create policy lumi_knowledge_delete on public.lumi_knowledge
 for delete to authenticated using(user_id=auth.uid());
revoke all on public.lumi_knowledge from anon,authenticated;
grant select,insert,delete on public.lumi_knowledge to authenticated;

-- No automatic collection, cross-account access, or background training.
