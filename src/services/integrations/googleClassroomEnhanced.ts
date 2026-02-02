import { apiClient } from '../core/client';
import { retryRequest } from '@/utils/apiRetry';

interface SyncOptions {
  fullSync?: boolean; // If false, attempt delta sync using sync tokens
}

export const GoogleClassroomEnhanced = {
  /**
   * Syncs courses with delta support
   */
  async syncCourses(teacherId: string, options: SyncOptions = {}): Promise<any> {
    return retryRequest(() => {
      return apiClient.post('/api/integrations/google/sync/courses', {
        teacherId,
        fullSync: options.fullSync
      });
    });
  },

  /**
   * Syncs coursework (assignments) for a specific course
   */
  async syncCourseWork(teacherId: string, courseId: string): Promise<any> {
    return retryRequest(() => {
      return apiClient.post(`/api/integrations/google/courses/${courseId}/sync-work`, {
        teacherId
      });
    });
  },

  /**
   * Syncs student grades/submissions
   */
  async syncGrades(teacherId: string, courseId: string): Promise<any> {
    return retryRequest(() => {
      return apiClient.post(`/api/integrations/google/courses/${courseId}/sync-grades`, {
        teacherId
      });
    });
  }
};
