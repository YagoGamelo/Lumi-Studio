-- LUMI: alternativa de verificação de número sem Twilio (TextBee + Android).
-- Executar APENAS esta migração adicional no Supabase SQL Editor, depois do alerts.sql.
-- Não eliminar nem voltar a executar schema.sql.
create table if not exists public.bot_alert_phone_otps (
 user_id uuid primary key references auth.users(id) on delete cascade,
 phone_e164 text not null check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 attempts int not null default 0 check(attempts between 0 and 8),
 created_at timestamptz not null default now()
);
alter table public.bot_alert_phone_otps enable row level security;
-- Apenas SUPABASE_SERVICE_ROLE_KEY pode ler ou escrever códigos, nem o dono pode.
revoke all on public.bot_alert_phone_otps from anon,authenticated;
