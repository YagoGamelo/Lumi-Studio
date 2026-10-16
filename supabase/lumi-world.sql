-- LUMI AI: external world discovery pilot.
-- Additional migration; does NOT change private notes, bots or AI quota.
-- Only metadata (title, source URL, timestamp) from approved RSS feeds.
-- No conversations, personal data, audiovisual content or model training.
create table if not exists public.lumi_world_observations (
 id uuid primary key default gen_random_uuid(),
 source_id text not null check (source_id in ('arxiv-ai','nasa-news')),
 title text not null check (char_length(title) between 5 and 240),
 source_url text not null unique check (char_length(source_url) between 16 and 700 and source_url like 'https://%'),
 published_at timestamptz,
 discovered_at timestamptz not null default now()
);
create index if not exists lumi_world_observations_recent_idx
 on public.lumi_world_observations(discovered_at desc);
alter table public.lumi_world_observations enable row level security;
drop policy if exists lumi_world_observations_read on public.lumi_world_observations;
create policy lumi_world_observations_read
 on public.lumi_world_observations for select to authenticated using (true);
revoke all on public.lumi_world_observations from anon,authenticated;
grant select on public.lumi_world_observations to authenticated;

-- Inserts, updates and cleanup are restricted to the protected server worker's
-- service-role key (which bypasses RLS). No public writes or training process.
