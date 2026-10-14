create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id),username text unique,referred_by uuid references public.profiles(id),stripe_customer_id text,stripe_connect_id text);
create table public.bots(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),title text,instruction text,category text,frequency text,status text default 'draft',created_at timestamptz default now());
create table public.bot_runs(id uuid primary key default gen_random_uuid(),bot_id uuid references public.bots(id),user_id uuid references auth.users(id),result text,status text default 'completed',created_at timestamptz default now());
create table public.studio_projects(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),title text,style text,duration int,script text,status text,created_at timestamptz default now());
create table public.referral_commissions(id uuid primary key default gen_random_uuid(),earner_id uuid references public.profiles(id),purchaser_id uuid references public.profiles(id),amount_cents int,available_at timestamptz,status text,created_at timestamptz default now());
create table public.referral_movements(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),amount_cents int,status text,kind text);
alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.bot_runs enable row level security;
alter table public.studio_projects enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.referral_movements enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid());
create policy bots_own on public.bots for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy runs_own on public.bot_runs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy studio_own on public.studio_projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy commissions_read on public.referral_commissions for select to authenticated using(earner_id=auth.uid());
create policy movements_read on public.referral_movements for select to authenticated using(user_id=auth.uid());
create or replace function public.complete_onboarding(new_username text,invitation_code text default null) returns void language plpgsql security definer set search_path=public as $$
declare referrer uuid;
begin
 if auth.uid() is null then raise exception 'Sem sessão'; end if;
 new_username:=lower(trim(new_username));
 if new_username !~ '^[a-z][a-z0-9_]{2,19}$' then raise exception 'Username inválido'; end if;
 if invitation_code is not null and invitation_code<>'' then
 select id into referrer from public.profiles where username=lower(trim(invitation_code));
 if referrer is null or referrer=auth.uid() then raise exception 'Código inválido'; end if;
 end if;
 insert into public.profiles(id,username,referred_by) values(auth.uid(),new_username,referrer);
end $$;
revoke all on function public.complete_onboarding(text,text) from public;
grant execute on function public.complete_onboarding(text,text) to authenticated;
