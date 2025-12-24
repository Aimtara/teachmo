import { useTenant } from '@/contexts/TenantContext';
import { logAnalyticsEvent } from '@/observability/telemetry';

export const useTelemetry = () => {
  const tenant = useTenant();
  const log = (event: string, metadata: Record<string, unknown> = {}) => {
    if (!tenant.organizationId) return;
    logAnalyticsEvent(
      { organizationId: tenant.organizationId, schoolId: tenant.schoolId },
      { eventName: event, metadata }
    ).catch(() => {});
  };

  return { log };
};
