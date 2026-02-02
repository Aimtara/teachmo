import { apiClient } from '../core/client';

export type EventType =
  | 'login'
  | 'activity_complete'
  | 'message_sent'
  | 'resource_download';

export interface AnalyticsEvent {
  type: EventType;
  userId: string;
  meta?: Record<string, unknown>;
  timestamp?: number;
}

export const AnalyticsService = {
  track: (event: AnalyticsEvent) => {
    console.log('[Analytics]', event);
    return apiClient
      .post('/api/analytics/events', {
        ...event,
        timestamp: event.timestamp || Date.now()
      })
      .catch((err) => console.warn('Failed to track event', err));
  },

  getEngagementReport: (scopeId: string, scopeType: 'class' | 'school') =>
    apiClient.get('/api/analytics/reports/engagement', { scopeId, scopeType })
};
