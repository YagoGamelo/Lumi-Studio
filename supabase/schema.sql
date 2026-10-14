-- LUMI Studio / Supabase SQL bootstrap. Run once in SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or username ~ '^[a-z][a-z0-9_]{2,19}$'),
  referred_by uuid references public.profiles(id),
  stripe_customer_id text unique,
  stripe_connect_id text unique,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_idx on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id=auth.uid());
-- Do not create browser update/insert policies: profile changes happen only through validated RPC.

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 75),
  instruction text not null check (char_length(instruction) between 12 and 2500),
  category text not null check (category in ('universal','content','planner','research','investment')),
  frequency text not null default 'manual' check (frequency in ('manual','daily','weekly')),
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_at timestamptz not null default now()
);
create index if not exists bots_user_id_idx on public.bots(user_id,created_at desc);
alter table public.bots enable row level security;
drop policy if exists bots_own_read on public.bots;
create policy bots_own_read on public.bots for select to authenticated using (user_id=auth.uid());
drop policy if exists bots_own_create on public.bots;
create policy bots_own_create on public.bots for insert to authenticated with check (user_id=auth.uid() and status='draft');
drop policy if exists bots_own_delete on public.bots;
create policy bots_own_delete on public.bots for delete to authenticated using (user_id=auth.uid());
-- No direct active status update by the browser.

create table if not exists public.bot_runs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  input text not null,
  output text,
  status text not null default 'done',
  created_at timestamptz not null default now()
);
create index if not exists bot_runs_user_idx on public.bot_runs(user_id,created_at desc);
alter table public.bot_runs enable row level security;
drop policy if exists bot_runs_self_read on public.bot_runs;
create policy bot_runs_self_read on public.bot_runs for select to authenticated using (user_id=auth.uid());
-- run inserts via server service role, not browser.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('avatar_front','avatar_left','avatar_right','avatar_consent','clip','music','video')),
  storage_path text not null,
  original_name text not null,
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists media_assets_user_idx on public.media_assets(user_id,created_at desc);
alter table public.media_assets enable row level security;
drop policy if exists assets_owner_read on public.media_assets;
create policy assets_owner_read on public.media_assets for select to authenticated using (user_id=auth.uid());
-- Uploads and asset rows handled by validated server endpoints.

create table if not exists public.content_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  topic text not null,
  style text not null default 'informativo',
  source_url text,
  script text,
  avatar_provider_id text,
  status text not null default 'draft' check (status in ('draft','script_ready','render_queued','rendering','rendered','failed')),
  external_job_id text,
  output_url text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.content_projects(user_id,created_at desc);
alter table public.content_projects enable row level security;
drop policy if exists projects_owner_read on public.content_projects;
create policy projects_owner_read on public.content_projects for select to authenticated using (user_id=auth.uid());

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('twitch','youtube')),
  provider_user_id text,
  display_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,provider)
);
alter table public.integrations enable row level security;
-- No browser-visible policy, especially not for encrypted secrets.
revoke all on public.integrations from anon, authenticated;

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  earner_id uuid not null references public.profiles(id),
  buyer_id uuid not null references public.profiles(id),
  invoice_id text not null unique,
  amount_cents integer not null check(amount_cents>=0),
  status text not null default 'pending' check(status in ('pending','available','reversed')),
  available_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists referral_earner_idx on public.referral_commissions(earner_id);
alter table public.referral_commissions enable row level security;
drop policy if exists referral_commissions_read on public.referral_commissions;
create policy referral_commissions_read on public.referral_commissions for select to authenticated using(earner_id=auth.uid());
revoke insert,update,delete on public.referral_commissions from authenticated,anon;

create table if not exists public.referral_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  kind text not null check(kind in ('payout','subscription_credit')),
  amount_cents integer not null check(amount_cents>0),
  status text not null default 'reserved' check(status in ('reserved','completed','failed')),
  provider_ref text,
  created_at timestamptz not null default now()
);
create index if not exists referral_movements_user_idx on public.referral_movements(user_id);
alter table public.referral_movements enable row level security;
drop policy if exists referral_movements_read on public.referral_movements;
create policy referral_movements_read on public.referral_movements for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.referral_movements from authenticated,anon;

create table if not exists public.billing_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon,authenticated;

create or replace function public.complete_onboarding(new_username text,invitation_code text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare inviter uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  new_username:=lower(trim(new_username));
  invitation_code:=nullif(lower(trim(invitation_code)),'');
  if new_username !~ '^[a-z][a-z0-9_]{2,19}$' then raise exception 'Username inválido'; end if;
  if invitation_code is not null then
    select id into inviter from public.profiles where username=invitation_code;
    if inviter is null then raise exception 'Código de convite inválido'; end if;
    if inviter=auth.uid() or invitation_code=new_username then raise exception 'Código próprio não permitido'; end if;
  end if;
  insert into public.profiles(id,username,referred_by) values(auth.uid(),new_username,inviter)
  on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id=auth.uid() and username=new_username) then
    raise exception 'Já tens um username ou o nome está em uso';
  end if;
end;
$$;
revoke execute on function public.complete_onboarding(text,text) from public;
grant execute on function public.complete_onboarding(text,text) to authenticated;

-- Backend-only atomic reservation. Serializes concurrent payout/credit requests per user.
create or replace function public.reserve_referral_funds(p_user uuid,p_kind text,p_amount integer)
returns uuid language plpgsql security definer set search_path = public
as $$
declare gross bigint; pending bigint; spent bigint; new_id uuid; 
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Server-only action';
  end if;
  if p_kind not in ('payout','subscription_credit') or p_amount<1000 then
    raise exception 'Montante inválido (mínimo de 10 euros)';
  end if;
  perform 1 from public.profiles where id=p_user for update;
  if not found then raise exception 'Perfil não encontrado'; end if;
  select coalesce(sum(amount_cents),0) into gross from public.referral_commissions
    where earner_id=p_user and status<>'reversed' and available_at<=now();
  select coalesce(sum(amount_cents),0) into spent from public.referral_movements
    where user_id=p_user and status in ('reserved','completed');
  if gross-spent<p_amount then raise exception 'Saldo insuficiente'; end if;
  insert into public.referral_movements(user_id,kind,amount_cents)
    values(p_user,p_kind,p_amount) returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.reserve_referral_funds(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_referral_funds(uuid,text,integer) to service_role;

-- Private storage for copyrighted clips and sensitive facial images.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lumi-private','lumi-private',false,104857600,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/wav'])
on conflict(id) do nothing;
-- Assets uploaded only by authenticated server endpoints with service role and verified paths.
