import { describe, expect, it, vi } from 'vitest';

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
  it('builds classrooms with student counts', async () => {
    const courseFilter = base44.entities.Course.filter as unknown as ReturnType<typeof vi.fn>;
    const enrollmentFilter = base44.entities.Enrollment.filter as unknown as ReturnType<typeof vi.fn>;

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
});
