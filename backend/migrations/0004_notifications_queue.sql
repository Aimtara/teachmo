-- Phase 6: notifications queue + deliverability

create table if not exists notification_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  channel text not null,
  title text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  segment jsonb not null default '{}'::jsonb,
  send_at timestamptz,
  status text not null default 'scheduled',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_messages_org on notification_messages(organization_id, school_id);
create index if not exists idx_notification_messages_status on notification_messages(status);
create index if not exists idx_notification_messages_send_at on notification_messages(send_at);

create table if not exists notification_queue (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references notification_messages(id) on delete cascade,
  recipient_id uuid not null,
  channel text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_queue_status on notification_queue(status, next_attempt_at);
create index if not exists idx_notification_queue_message on notification_queue(message_id);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references notification_messages(id) on delete cascade,
  recipient_id uuid not null,
  channel text not null,
  status text not null,
  provider_response jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_deliveries_message on notification_deliveries(message_id);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references notification_deliveries(id) on delete cascade,
  message_id uuid not null,
  recipient_id uuid,
  event_type text not null,
  event_ts timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_notification_events_message on notification_events(message_id);
create index if not exists idx_notification_events_type on notification_events(event_type);

create table if not exists notification_dead_letters (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references notification_queue(id) on delete cascade,
  message_id uuid not null,
  recipient_id uuid not null,
  channel text,
  error text,
  failed_at timestamptz not null default now()
);
