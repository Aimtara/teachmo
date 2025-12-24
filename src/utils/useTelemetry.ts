import { API_BASE_URL } from '@/config/api';

export const useTelemetry = () => {
  const log = (event: string, metadata: Record<string, unknown> = {}) => {
    fetch(`${API_BASE_URL}/log/telemetry`, {
      method: 'POST',
      body: JSON.stringify({ event, metadata }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return { log };
};
