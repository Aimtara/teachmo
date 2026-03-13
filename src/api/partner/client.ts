import { getApiBaseUrl } from '@/config/api';
import { requestJson } from '@/api/http/client';
import type { HttpRequestOptions, TenantScope } from '@/types/api';


export async function partnerRequest<T = unknown>(
  path: string,
  options: HttpRequestOptions = {},
  tenant?: TenantScope
): Promise<T | Record<string, never>> {
  return requestJson<T | Record<string, never>>(`${getApiBaseUrl()}${path}`, options, tenant);
}
