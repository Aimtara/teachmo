import { API_BASE_URL } from '@/config/api';

export type SystemHealthService = {
  name: string;
  status: string;
  errorRate24h?: number;
};

export type SystemHealthDependency = {
  name: string;
  status: string;
  pending?: number;
  dead?: number;
};

export type SystemHealthResponse = {
  services?: SystemHealthService[];
  dependencies?: SystemHealthDependency[];
};

export async function getAdminSystemHealth(headers?: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}/admin/system/health`, { headers });
  if (!response.ok) throw new Error('Failed to load system health');
  return response.json() as Promise<SystemHealthResponse>;
}
