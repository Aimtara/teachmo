-- Phase 7: Partner onboarding, billing, fraud, analytics

create extension if not exists pgcrypto;

create table if not exists partner_profiles (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  company_name text not null,
  contact_name text,
  contact_email text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_partner_profiles_district_partner on partner_profiles(district_id, partner_user_id);
create index if not exists idx_partner_profiles_district on partner_profiles(district_id);

create table if not exists partner_agreements (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  agreement_type text not null,
  status text not null default 'pending',
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partner_agreements_district on partner_agreements(district_id);
create index if not exists idx_partner_agreements_partner on partner_agreements(partner_user_id);

create table if not exists partner_payout_settings (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  payout_method text not null,
  payout_currency text not null default 'usd',
  account_last4 text,
  status text not null default 'pending',
  tax_form_status text not null default 'missing',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_partner_payout_settings_district_partner on partner_payout_settings(district_id, partner_user_id);

create table if not exists partner_commission_plans (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partner_commission_plans_district on partner_commission_plans(district_id);

create table if not exists partner_commission_tiers (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references partner_commission_plans(id) on delete cascade,
  min_volume numeric not null default 0,
  max_volume numeric,
  rate numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_commission_tiers_plan on partner_commission_tiers(plan_id);

create table if not exists partner_commission_events (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  plan_id uuid references partner_commission_plans(id),
  revenue_amount numeric not null,
  commission_amount numeric not null,
  event_type text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_commission_events_district on partner_commission_events(district_id);
create index if not exists idx_partner_commission_events_partner on partner_commission_events(partner_user_id);

create table if not exists partner_revenue_events (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  revenue_amount numeric not null,
  attribution_source text,
  event_ts timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_partner_revenue_events_district on partner_revenue_events(district_id);
create index if not exists idx_partner_revenue_events_partner on partner_revenue_events(partner_user_id);

create table if not exists partner_fraud_signals (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  signal_type text not null,
  severity text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partner_fraud_signals_district on partner_fraud_signals(district_id);
create index if not exists idx_partner_fraud_signals_status on partner_fraud_signals(status);

create table if not exists partner_fraud_reviews (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references partner_fraud_signals(id) on delete cascade,
  reviewer_id uuid,
  outcome text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_fraud_reviews_signal on partner_fraud_reviews(signal_id);

create table if not exists partner_action_audits (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null,
  partner_user_id uuid not null,
  actor_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_action_audits_district on partner_action_audits(district_id);
create index if not exists idx_partner_action_audits_partner on partner_action_audits(partner_user_id);
