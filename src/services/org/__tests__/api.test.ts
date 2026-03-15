import { describe, expect, it, vi } from 'vitest';

const { filter } = vi.hoisted(() => ({
  filter: vi.fn()
}));

vi.mock('../../core/client', () => ({
  apiClient: {
    entity: {
      filter
    }
  }
}));

import { OrgService } from '../api';

describe('OrgService', () => {
  it('builds classrooms with student counts', async () => {
    filter.mockImplementation((name: string, params: { course_id?: string; teacher_id?: string }) => {
      if (name === 'Course') {
        return Promise.resolve([
          { id: 'course-1', name: 'Math' },
          { id: 'course-2', name: 'Science' }
        ]);
      }
      if (name === 'Enrollment') {
        return Promise.resolve(params.course_id === 'course-1' ? [{ id: 'enroll-1' }] : [{ id: 'a' }, { id: 'b' }]);
      }
      return Promise.resolve([]);
    });

    const classrooms = await OrgService.getClassrooms('teacher-1');

    expect(classrooms).toEqual([
      { id: 'course-1', name: 'Math', studentCount: 1 },
      { id: 'course-2', name: 'Science', studentCount: 2 }
    ]);
  });
});
