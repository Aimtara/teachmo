import { apiFetchJson, type ApiHeaders } from '@/domains/http';

export type PartnerIncentive = {
  id: string;
  title?: string;
  description?: string;
  value?: number | string | null;
};

export type PartnerIncentiveApplication = {
  id: string;
  incentive_id: string;
  status?: string | null;
};

export async function listPartnerIncentives(headers: ApiHeaders = {}) {
  return apiFetchJson<PartnerIncentive[]>('/incentives', { headers });
}

export async function listPartnerIncentiveApplications(partnerId: string, headers: ApiHeaders = {}) {
  return apiFetchJson<PartnerIncentiveApplication[]>(
    `/incentives/applications/${encodeURIComponent(partnerId)}`,
    { headers },
  );
}

export async function applyForPartnerIncentive(id: string, partnerId: string, headers: ApiHeaders = {}) {
  return apiFetchJson(`/incentives/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
    headers,
    body: { partnerId },
  });
}

export async function claimPartnerIncentive(id: string, partnerId: string, headers: ApiHeaders = {}) {
  return apiFetchJson(`/incentives/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    headers,
    body: { partnerId },
  });
}
