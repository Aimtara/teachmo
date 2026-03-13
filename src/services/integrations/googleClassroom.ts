import { z } from 'zod';
import { googleClassroomSync, type GoogleSyncData } from '@/api/functions';
import { retryRequest } from '@/utils/apiRetry';

interface SyncResult {
  syncedCourses: number;
  syncedAssignments: number;
  errors: string[];
}

const googleSyncDataSchema = z.object({
  success: z.boolean().optional(),
  totalSynced: z.number().optional(),
  error: z.string().optional(),
});

function parseGoogleSyncData(value: unknown): GoogleSyncData {
  const parsed = googleSyncDataSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export const GoogleClassroomService = {
  /**
   * Syncs courses and coursework for a specific teacher.
   * Handles rate limits and token refresh automatically via retryRequest.
   */
  async syncCourses(
    teacherId: string,
    options: { includeAssignments?: boolean } = {}
  ): Promise<SyncResult> {
    const result: SyncResult = {
      syncedCourses: 0,
      syncedAssignments: 0,
      errors: []
    };

    try {
      const courseResponse = await retryRequest(() =>
        googleClassroomSync({
          action: 'sync_courses',
          teacherId
        })
      );
      const courseData = parseGoogleSyncData(courseResponse?.data);

      if (!courseData.success) {
        throw new Error(courseData.error || 'Failed to sync Google Classroom courses.');
      }

      result.syncedCourses = courseData.totalSynced ?? 0;

      if (options.includeAssignments) {
        result.syncedAssignments = await this.syncAssignmentsForCourse(
          teacherId,
          'all'
        );
      }
    } catch (error: unknown) {
      console.error('Fatal Google Sync Error', error);
      throw new Error(
        'Google Classroom sync failed. Please reconnect your account.'
      );
    }

    return result;
  },

  async syncAssignmentsForCourse(
    teacherId: string,
    courseId: string
  ): Promise<number> {
    const response = await retryRequest(() =>
      googleClassroomSync({
        action: 'sync_assignments',
        courseId,
        teacherId
      })
    );
    const data = parseGoogleSyncData(response?.data);

    if (!data.success) {
      throw new Error(data.error || 'Failed to sync assignments.');
    }

    return data.totalSynced ?? 0;
  }
};
