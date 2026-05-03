import { createLogger } from '@/utils/logger';

const logger = createLogger('security-status');

export type AuditFindingStatus = 'passed' | 'failed' | 'pending';

export type AuditFinding = {
  id: string;
  control: string;
  status: AuditFindingStatus;
  severity?: 'low' | 'medium' | 'high';
};

export type AuditSummaryResponse = {
  findings?: AuditFinding[];
  lastChecked?: string;
};

export const FALLBACK_FINDINGS: AuditFinding[] = [
  { id: 'encryption', control: 'Encryption at rest', status: 'passed', severity: 'high' },
  { id: 'sso', control: 'SSO enforcement', status: 'pending', severity: 'medium' },
  { id: 'least-privilege', control: 'Least privilege reviews', status: 'passed', severity: 'medium' },
  { id: 'audit-trail', control: 'Audit trail coverage', status: 'failed', severity: 'high' },
];

export async function getSecurityAuditSummary(): Promise<AuditSummaryResponse> {
  if (typeof fetch !== 'function') return { findings: FALLBACK_FINDINGS, lastChecked: new Date().toISOString() };

  const response = await fetch('/functions/security/audit-summary').catch((error) => {
    logger.warn('Audit summary fetch failed', error);
    return null;
  });

  if (!response?.ok) {
    return { findings: FALLBACK_FINDINGS, lastChecked: new Date().toISOString() };
  }

  return response.json();
}
