import React from 'react';
import { renderWithProviders, screen, waitFor, axe } from '../testing/testUtils';
import ModerationDashboard from '@/pages/ModerationDashboard';
import { ModerationReport, ModerationAction, CommunityGuideline } from '@/api/entities';

// Mock the entities
jest.mock('@/api/entities', () => ({
  ModerationReport: {
    list: jest.fn(),
    update: jest.fn(),
  },
  ModerationAction: {
    list: jest.fn(),
    create: jest.fn(),
  },
  CommunityGuideline: {
    list: jest.fn(),
  },
}));

// Mock RoleGuard
jest.mock('@/components/shared/RoleGuard', () => {
  return function MockRoleGuard({ children }) {
    return <div>{children}</div>;
  };
});

describe('ModerationDashboard', () => {
  const mockReports = [
    {
      id: 'report-1',
      content_type: 'post',
      content_id: 'post-123',
      reported_user_id: 'user-456',
      reporter_user_id: 'user-789',
      report_reason: 'harassment',
      description: 'User is being inappropriate',
      status: 'pending',
      priority: 'high',
      created_date: '2024-01-15T10:00:00Z',
      auto_flagged: false,
      toxicity_score: 0.8,
    },
    {
      id: 'report-2',
      content_type: 'comment',
      content_id: 'comment-456',
      reported_user_id: 'user-123',
      reporter_user_id: 'user-789',
      report_reason: 'spam',
      description: 'Repeated spam messages',
      status: 'resolved',
      priority: 'medium',
      created_date: '2024-01-14T15:30:00Z',
      auto_flagged: true,
      toxicity_score: 0.3,
      resolved_at: '2024-01-14T16:00:00Z',
    }
  ];

  const mockActions = [
    {
      id: 'action-1',
      target_type: 'post',
      target_id: 'post-123',
      action_type: 'content_removed',
      moderator_id: 'mod-1',
      reason: 'Violated community guidelines',
      is_active: true,
      created_date: '2024-01-15T11:00:00Z',
      appeal_status: 'none',
    }
  ];

  const mockGuidelines = [
    {
      id: 'guideline-1',
      title: 'Respectful Communication',
      content: 'All members must communicate respectfully with others.',
      category: 'respect',
      order: 1,
      is_active: true,
      last_updated: '2024-01-01T00:00:00Z',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ModerationReport.list.mockResolvedValue(mockReports);
    ModerationAction.list.mockResolvedValue(mockActions);
    CommunityGuideline.list.mockResolvedValue(mockGuidelines);
  });

  it('renders the moderation dashboard', async () => {
    renderWithProviders(<ModerationDashboard />);
    
    expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    expect(screen.getByText('Monitor and manage community content and user reports')).toBeInTheDocument();
  });

  it('displays correct stats', async () => {
    renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending Reports
      expect(screen.getByText('0')).toBeInTheDocument(); // Resolved Today (mock date check)
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Actions
      expect(screen.getByText('2.4h')).toBeInTheDocument(); // Avg Response Time
    });
  });

  it('displays reports with correct information', async () => {
    renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
      expect(screen.getByText('User is being inappropriate')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('Auto-flagged by AI')).toBeInTheDocument();
      expect(screen.getByText('Toxicity: 80%')).toBeInTheDocument();
    });
  });

  it('allows filtering reports by status', async () => {
    const { user } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });

    // Filter by resolved status
    const statusFilter = screen.getByDisplayValue('All Status');
    await user.click(statusFilter);
    await user.click(screen.getByText('Resolved'));
    
    await waitFor(() => {
      expect(screen.queryByText('Harassment')).not.toBeInTheDocument();
      expect(screen.getByText('Spam')).toBeInTheDocument();
    });
  });

  it('opens review modal when review button is clicked', async () => {
    const { user } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByText('Review');
    await user.click(reviewButtons[0]);
    
    expect(screen.getByText('Review Report')).toBeInTheDocument();
  });

  it('displays moderation actions in actions tab', async () => {
    const { user } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Actions'));
    
    await waitFor(() => {
      expect(screen.getByText('content removed')).toBeInTheDocument();
      expect(screen.getByText('Violated community guidelines')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('displays community guidelines in guidelines tab', async () => {
    const { user } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Guidelines'));
    
    await waitFor(() => {
      expect(screen.getByText('Respectful Communication')).toBeInTheDocument();
      expect(screen.getByText('All members must communicate respectfully with others.')).toBeInTheDocument();
    });
  });

  it('resolves a report with action', async () => {
    const { user } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });

    // Open review modal
    const reviewButtons = screen.getAllByText('Review');
    await user.click(reviewButtons[0]);
    
    // Select action
    const actionSelect = screen.getByDisplayValue('Select an action');
    await user.click(actionSelect);
    await user.click(screen.getByText('Remove Content'));
    
    // Add notes
    const notesTextarea = screen.getByPlaceholderText('Add notes about your decision...');
    await user.type(notesTextarea, 'Content violates community standards');
    
    // Resolve report
    await user.click(screen.getByText('Resolve Report'));
    
    expect(ModerationReport.update).toHaveBeenCalledWith('report-1', {
      status: 'resolved',
      moderator_notes: 'Content violates community standards',
      action_taken: 'content_removed',
      resolved_at: expect.any(String),
    });
    
    expect(ModerationAction.create).toHaveBeenCalledWith({
      target_type: 'post',
      target_id: 'post-123',
      action_type: 'content_removed',
      moderator_id: 'current-user-id',
      reason: 'Content violates community standards',
      related_report_id: 'report-1',
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<ModerationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Harassment')).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
