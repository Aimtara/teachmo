/* global vi */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeacherMessages from '@/pages/TeacherMessages';

const mockGetClassrooms = vi.fn();
const mockConversationFilter = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
const mockMessageFilter = vi.fn();
const mockMessageCreate = vi.fn();

vi.mock('@/components/shared/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', role: 'teacher' } }),
}));

vi.mock('@/services/org/api', () => ({
  OrgService: {
    getClassrooms: (...args) => mockGetClassrooms(...args),
  },
}));

vi.mock('@/api/entities', () => ({
  UserConversation: {
    filter: (...args) => mockConversationFilter(...args),
    create: (...args) => mockConversationCreate(...args),
    update: (...args) => mockConversationUpdate(...args),
  },
  UserMessage: {
    filter: (...args) => mockMessageFilter(...args),
    create: (...args) => mockMessageCreate(...args),
  },
}));

function renderPage(path = '/teacher-messages?course_id=course-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TeacherMessages />
    </MemoryRouter>
  );
}

describe('TeacherMessages', () => {
  beforeEach(() => {
    mockGetClassrooms.mockReset();
    mockConversationFilter.mockReset();
    mockConversationCreate.mockReset();
    mockConversationUpdate.mockReset();
    mockMessageFilter.mockReset();
    mockMessageCreate.mockReset();

    mockGetClassrooms.mockResolvedValue([{ id: 'course-1', name: 'Math', studentCount: 22 }]);
    mockConversationFilter.mockResolvedValue([
      {
        id: 'conv-1',
        thread_id: 'teacher_course_course-1',
        participant_ids: ['teacher-1', 'parent-1'],
        last_message_preview: 'Existing preview',
        last_activity: '2026-03-20T10:00:00.000Z',
      },
    ]);
    mockMessageFilter.mockResolvedValue([]);
    mockMessageCreate.mockResolvedValue({
      id: 'msg-1',
      thread_id: 'teacher_course_course-1',
      sender_id: 'teacher-1',
      recipient_id: 'parent-1',
      content: 'Hello class',
      created_date: '2026-03-20T10:01:00.000Z',
    });
    mockConversationUpdate.mockResolvedValue({});
  });

  it('shows class conversation preview from conversation thread data', async () => {
    renderPage();

    expect(await screen.findByText('Existing preview')).toBeInTheDocument();
    expect(screen.getByText(/class conversations/i)).toBeInTheDocument();
  });

  it('sends to a non-self participant when available', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Existing preview');
    await user.type(screen.getByLabelText(/message to math/i), 'Hello class');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: 'teacher-1',
          recipient_id: 'parent-1',
          content: 'Hello class',
        })
      );
    });
  });

  it('requires a recipient when starting a new class thread', async () => {
    const user = userEvent.setup();
    mockConversationFilter.mockResolvedValueOnce([]);

    renderPage();

    await screen.findByText(/no thread exists for this class yet/i);
    await user.type(screen.getByLabelText(/message to math/i), 'First message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/select a recipient for this class thread/i)).toBeInTheDocument();
    expect(mockMessageCreate).not.toHaveBeenCalled();
  });
});
