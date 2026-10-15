-- Migração adicional da LUMI Stream Studio (não voltar a executar schema.sql).
-- Executar uma vez no Supabase > SQL Editor > New query > Run.
-- Apenas o dono pode escrever; o overlay público obtém SOMENTE os campos
-- visuais de um perfil através de um token aleatório de 192 bits.
create table if not exists public.stream_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token text not null unique check (char_length(token)=48 and token ~ '^[a-f0-9]+$'),
 title text not null default 'A minha stream',
 handle text not null default '@creator',
 accent text not null default '#997bff',
 scene text not null default 'A começar',
 message text not null default 'Bem-vindos à live!',
 updated_at timestamptz not null default now()
);
alter table public.stream_profiles enable row level security;
grant select,insert,update,delete on public.stream_profiles to authenticated;
drop policy if exists stream_profiles_owner on public.stream_profiles;
create policy stream_profiles_owner on public.stream_profiles
 for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- SECURITY DEFINER lê só a linha indicada pelo token; nunca devolve o token,
-- o ID do utilizador ou dados de autenticação.
create or replace function public.stream_overlay_by_token(p_token text)
returns table (title text, handle text, accent text, scene text, message text)
language sql stable security definer set search_path=public
as $$
 select s.title,s.handle,s.accent,s.scene,s.message
 from public.stream_profiles as s
 where length(p_token)=48 and s.token=p_token
 limit 1
$$;
revoke all on function public.stream_overlay_by_token(text) from public;
grant execute on function public.stream_overlay_by_token(text) to anon,authenticated;
