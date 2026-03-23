/* global vi */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeacherAssignments from '@/pages/TeacherAssignments';

const mockGetClassrooms = vi.fn();
const mockUser = { id: 'teacher-1', role: 'teacher' };

vi.mock('@/components/shared/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/services/org/api', () => ({
  OrgService: {
    getClassrooms: (...args) => mockGetClassrooms(...args),
  },
}));

vi.mock('@/components/teacher/AssignmentsView', () => ({
  default: () => <div data-testid="assignments-view">Assignments View</div>,
}));

function renderPage(path = '/teacher-assignments') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TeacherAssignments />
    </MemoryRouter>
  );
}

describe('TeacherAssignments page', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockGetClassrooms.mockReset();
    mockGetClassrooms.mockResolvedValue([]);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows retryable error UI when class loading fails', async () => {
    const user = userEvent.setup();
    mockGetClassrooms
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce([{ id: 'course-1', name: 'English', studentCount: 18 }]);

    renderPage();

    expect(await screen.findByText(/could not load classes/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  it('shows class not found state for invalid course_id', async () => {
    mockGetClassrooms.mockResolvedValueOnce([{ id: 'course-1', name: 'English', studentCount: 18 }]);

    renderPage('/teacher-assignments?course_id=missing-course');

    expect(await screen.findByText(/class not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to all classes/i })).toBeInTheDocument();
  });
});
