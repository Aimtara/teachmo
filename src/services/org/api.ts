import { apiClient } from '../core/client';
import type { Classroom } from './types';

export const OrgService = {
  getSchools: () => apiClient.get('/api/org/schools'),
  getClassrooms: async (teacherId: string): Promise<Classroom[]> => {
    const courses = await apiClient.entity.filter<Classroom>('Course', { teacher_id: teacherId });
    if (!Array.isArray(courses) || courses.length === 0) {
      return [];
    }

    const classData = await Promise.all(
      courses.map(async (course) => {
        try {
          const enrollments = await apiClient.entity.filter('Enrollment', { course_id: course.id });
          return {
            ...course,
            studentCount: Array.isArray(enrollments) ? enrollments.length : 0,
          };
        } catch (error) {
          return { ...course, studentCount: 0 };
        }
      })
    );

    return classData;
  },
};
