/* global vi */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentsView from '@/components/teacher/AssignmentsView';

const mockGraphqlRequest = vi.fn();

vi.mock('@/lib/graphql', () => ({
  graphqlRequest: (...args) => mockGraphqlRequest(...args),
}));

vi.mock('@/services/integrations/googleClassroom', () => ({
  GoogleClassroomService: {
    syncAssignmentsForCourse: vi.fn(),
  },
}));

describe('AssignmentsView', () => {
  beforeEach(() => {
    mockGraphqlRequest.mockReset();
  });

  it('loads assignments via GraphQL query', async () => {
    mockGraphqlRequest.mockResolvedValueOnce({ assignments: [] });

    render(
      <AssignmentsView
        classData={{ course: { id: 'course-123', name: 'Algebra' }, studentCount: 24 }}
        currentUser={{ id: 'teacher-1' }}
      />
    );

    await waitFor(() => {
      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('query AssignmentsByCourse'),
          variables: { courseId: 'course-123' },
        })
      );
    });

    expect(screen.getByText(/no assignments yet/i)).toBeInTheDocument();
  });

  it('creates assignments via GraphQL mutation', async () => {
    const user = userEvent.setup();
    mockGraphqlRequest
      .mockResolvedValueOnce({ assignments: [] })
      .mockResolvedValueOnce({ insert_assignments_one: { id: 'assignment-1' } })
      .mockResolvedValueOnce({
        assignments: [{ id: 'assignment-1', title: 'Week 1 Quiz', description: null, due_at: null, submission_count: 0 }],
      });

    render(
      <AssignmentsView
        classData={{ course: { id: 'course-123', name: 'Algebra' }, studentCount: 24 }}
        currentUser={{ id: 'teacher-1' }}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /create assignment/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create assignment/i }));
    await user.type(screen.getByLabelText(/^title$/i), 'Week 1 Quiz');
    const createButtons = screen.getAllByRole('button', { name: /^create assignment$/i });
    await user.click(createButtons[1]);

    await waitFor(() => {
      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('mutation CreateAssignment'),
          variables: expect.objectContaining({
            object: expect.objectContaining({
              course_id: 'course-123',
              teacher_user_id: 'teacher-1',
              title: 'Week 1 Quiz',
            }),
          }),
        })
      );
    });

    expect(await screen.findByText(/assignment created successfully/i)).toBeInTheDocument();
  });
});
