import { apiClient } from '../core/client';
import { retryRequest } from '@/utils/apiRetry';

export interface SisConfig {
  type: 'oneroster' | 'powerschool' | 'infinite_campus';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface SisSyncStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details?: any;
}

export const SisService = {
  /**
   * Test connection to SIS
   */
  async testConnection(config: SisConfig): Promise<boolean> {
    try {
      await retryRequest(() => apiClient.post('/api/integrations/sis/test', config));
      return true;
    } catch (error) {
      console.error('SIS Connection Test Failed', error);
      return false;
    }
  },

  /**
   * Trigger a manual roster sync
   */
  async syncRosters(schoolId: string): Promise<{ status: string; jobId: string }> {
    return apiClient.post<{ status: string; jobId: string }>(
      `/api/integrations/sis/${schoolId}/sync`,
      {}
    );
  },

  /**
   * Get sync status
   */
  async getSyncStatus(jobId: string): Promise<SisSyncStatus> {
    return apiClient.get(`/api/integrations/sis/jobs/${jobId}`);
  }
};
