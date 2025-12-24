import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

export async function partnerRequest(path, options = {}, tenant) {
  const token = await nhost.auth.getAccessToken();
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (options.method === 'HEAD') return {};
  return res.json();
}
