import { useEffect, useRef } from 'react';
import { useAuthenticationStatus, useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';
import { trackEvent } from './telemetry';

export function TelemetryBootstrap() {
  const { isAuthenticated } = useAuthenticationStatus();
  const userId = useUserId();
  const { data: scope } = useTenantScope();
  const fired = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !userId || fired.current) return;

    fired.current = true;
    void trackEvent({
      eventName: 'auth.login',
      entityType: 'user',
      entityId: userId,
      metadata: {
        role: scope?.role ?? null,
        district_id: scope?.districtId ?? null,
        school_id: scope?.schoolId ?? null,
        source: 'client'
      },
    });
  }, [isAuthenticated, userId, scope?.role, scope?.districtId, scope?.schoolId]);

  return null;
}
