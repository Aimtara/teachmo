alter table public.partner_incentive_applications
  add column if not exists incentive_id text;

create index if not exists partner_incentive_applications_incentive_id_idx
  on public.partner_incentive_applications (incentive_id);
