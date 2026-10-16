-- LUMI UNIVERSAL BUILDER: guardar a arvore de capacidades de cada bot.
-- Migracao ADICIONAL e idempotente. Executar no Supabase SQL Editor.
-- Nao apagar nem voltar a executar schema.sql.
-- Esta tabela guarda apenas PLANEAMENTO: nao concede tokens, permissoes nem executa APIs.
create table if not exists public.bot_blueprints (
 bot_id uuid primary key references public.bots(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 objective text not null check(char_length(objective) between 10 and 1500),
 blueprint jsonb not null check (
   jsonb_typeof(blueprint) = 'object'
   and jsonb_typeof(blueprint->'nodes') = 'array'
   and jsonb_array_length(blueprint->'nodes') between 1 and 20
   and octet_length(blueprint::text) <= 16384
 ),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists bot_blueprints_owner_idx on public.bot_blueprints(user_id);
alter table public.bot_blueprints enable row level security;
drop policy if exists bot_blueprints_owner on public.bot_blueprints;
create policy bot_blueprints_owner on public.bot_blueprints
 for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.bot_blueprints to authenticated;

create or replace function public.check_bot_blueprint_owner() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if not exists(
  select 1 from public.bots where id=new.bot_id and user_id=new.user_id
 ) then
  raise exception 'Este bot nao pertence ao utilizador';
 end if;
 return new;
end;
$$;
drop trigger if exists bot_blueprints_owner_trigger on public.bot_blueprints;
create trigger bot_blueprints_owner_trigger
 before insert or update of bot_id,user_id on public.bot_blueprints
 for each row execute function public.check_bot_blueprint_owner();
