import { getApiBaseUrl } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { enqueueRequest } from '@/offline/OfflineStorageManager';
import { flushQueuedRequests, getQueuedRequests } from '@/offline/BackgroundSyncService';

export type TenantScope = {
  organizationId: string;
  schoolId?: string | null;
};

export type AnalyticsEvent = {
  eventName: string;
  eventTs?: string;
  actorId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
  source?: string;
};

async function authHeaders(tenant?: TenantScope) {
  const token = await nhost.auth.getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant?.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
  if (tenant?.schoolId) headers['x-teachmo-school-id'] = String(tenant.schoolId);
  return headers;
}

export async function logAnalyticsEvent(tenant: TenantScope, event: AnalyticsEvent) {
  const url = `${getApiBaseUrl()}/analytics/events`;
  const headers = await authHeaders(tenant);
  const payload = { events: [{ ...event, eventTs: event.eventTs || new Date().toISOString() }] };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueRequest({
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      return { queued: true };
    }
    throw err;
  }
}

export function installTelemetryAutoFlush() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    flushQueuedRequests().catch(() => {});
  });

  if (typeof window.setInterval === 'function') {
    window.setInterval(() => {
      if (navigator.onLine) {
        flushQueuedRequests().catch(() => {});
      }
    }, 30000);
  }

  getQueuedRequests().then((queue) => {
    if (queue.length && navigator.onLine) {
      flushQueuedRequests().catch(() => {});
    }
  }).catch(() => {});
}
