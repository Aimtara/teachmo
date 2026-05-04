import { getJson } from '@/domains/http';

export type AuditLogEntry = {
  id: string | number;
  user_email?: string;
  adminId?: string;
  action: string;
  entity?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export function listAdminAuditLogs() {
  return getJson<AuditLogEntry[]>('/admin/audit-logs');
}
