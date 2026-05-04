import { apiJson } from '@/domains/http';

export type PartnerSubmission = {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  status?: string | null;
};

export type TenantHeaders = Record<string, string>;

export function listPartnerSubmissions(headers: TenantHeaders = {}) {
  return apiJson<PartnerSubmission[]>('/submissions', { headers });
}

export function createPartnerSubmission(
  payload: { title: string; description: string; type: string },
  headers: TenantHeaders = {},
) {
  return apiJson<PartnerSubmission>('/submissions', {
    method: 'POST',
    headers,
    body: payload,
  });
}

export function updatePartnerSubmission(id: string, payload: { title: string }, headers: TenantHeaders = {}) {
  return apiJson<PartnerSubmission>(`/submissions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    body: payload,
  });
}

export function updatePartnerSubmissionTitle(id: string, title: string, headers: TenantHeaders = {}) {
  return updatePartnerSubmission(id, { title }, headers);
}
