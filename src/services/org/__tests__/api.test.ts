import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/api/base44/client', () => ({
  base44: {
    entities: {
      Course: {
        filter: vi.fn(),
      },
      Enrollment: {
        filter: vi.fn(),
      },
    },
  },
}));

import { OrgService } from '../api';
import { base44 } from '@/api/base44/client';

describe('OrgService', () => {
  let courseFilter: ReturnType<typeof vi.fn>;
  let enrollmentFilter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    courseFilter = base44.entities.Course.filter as unknown as ReturnType<typeof vi.fn>;
    enrollmentFilter = base44.entities.Enrollment.filter as unknown as ReturnType<typeof vi.fn>;
  });

  it('builds classrooms with student counts', async () => {

    courseFilter.mockResolvedValue([
      { id: 'course-1', name: 'Math' },
      { id: 'course-2', name: 'Science' },
    ]);
    enrollmentFilter.mockImplementation(({ course_id }: { course_id: string }) =>
      Promise.resolve(course_id === 'course-1' ? [{ id: 'enroll-1' }] : [{ id: 'a' }, { id: 'b' }])
    );

    const classrooms = await OrgService.getClassrooms('teacher-1');

    expect(classrooms).toEqual([
      { id: 'course-1', name: 'Math', studentCount: 1 },
      { id: 'course-2', name: 'Science', studentCount: 2 },
    ]);
  });

  it('handles enrollment fetch errors by returning studentCount: 0', async () => {
    courseFilter.mockResolvedValue([
      { id: 'course-1', name: 'Math' },
      { id: 'course-2', name: 'Science' },
    ]);
    
    // Mock enrollment fetch to throw an error for course-1, succeed for course-2
    enrollmentFilter.mockImplementation(({ course_id }: { course_id: string }) => {
      if (course_id === 'course-1') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve([{ id: 'a' }, { id: 'b' }]);
    });

    const classrooms = await OrgService.getClassrooms('teacher-1');

    expect(classrooms).toEqual([
      { id: 'course-1', name: 'Math', studentCount: 0 },
      { id: 'course-2', name: 'Science', studentCount: 2 },
    ]);
  });
});
