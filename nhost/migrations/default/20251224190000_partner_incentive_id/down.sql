drop index if exists public.partner_incentive_applications_incentive_id_idx;

alter table public.partner_incentive_applications
  drop column if exists incentive_id;
