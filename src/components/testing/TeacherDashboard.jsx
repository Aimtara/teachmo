
/* global describe, test, expect, beforeEach, waitFor */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockTeacher, mockCourse, mockUser, expectToastMessage } from './TestUtils';
import TeacherDashboard from '@/pages/TeacherDashboard';

describe('Teacher Dashboard', () => {
  beforeEach(() => {
    const teacherData = mockTeacher();
    const coursesData = [
      mockCourse(),
      mockCourse({ id: 'course456', name: '2nd Grade Reading', course_code: '2A-READ' })
    ];
    
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(teacherData);
    const { Course } = require('@/api/entities');
    Course.filter.mockResolvedValue(coursesData);
    const { Assignment } = require('@/api/entities');
    Assignment.filter.mockResolvedValue([]);
    const { UserMessage } = require('@/api/entities');
    UserMessage.filter.mockResolvedValue([]);
  });

  test('displays teacher welcome message', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
  });

  test('shows connected courses', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('2nd Grade Math')).toBeInTheDocument();
      expect(screen.getByText('2nd Grade Reading')).toBeInTheDocument();
      expect(screen.getByText(/2 classes/i)).toBeInTheDocument();
    });
  });

  test('displays Google Classroom connection status', async () => {
    // Test disconnected state
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/connect google classroom/i)).toBeInTheDocument();
    });
    
    // Test connected state
    const connectedTeacher = mockTeacher({ google_classroom_connected: true });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(connectedTeacher);
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/connected to google classroom/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
  });

  test('allows manual Google Classroom sync', async () => {
    const connectedTeacher = mockTeacher({ 
      google_classroom_connected: true,
      last_integration_sync: '2024-01-15T09:00:00Z'
    });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(connectedTeacher);
    const { googleClassroomSync } = require('@/api/functions');
    googleClassroomSync.mockResolvedValue({
      data: { success: true, message: 'Sync completed successfully' }
    });
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
    
    // Click sync button
    const syncButton = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(googleClassroomSync).toHaveBeenCalledWith({
        teacher_user_id: connectedTeacher.id
      });
    });
    
    await expectToastMessage(/sync completed successfully/i);
  });

  test('shows last sync timestamp', async () => {
    const connectedTeacher = mockTeacher({ 
      google_classroom_connected: true,
      last_integration_sync: '2024-01-15T09:00:00Z'
    });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(connectedTeacher);
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/last synced/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15/i)).toBeInTheDocument();
    });
  });

  test('displays recent messages from parents', async () => {
    const messagesData = [
      {
        id: 'msg1',
        sender_id: 'parent123',
        recipient_id: 'teacher456',
        content: 'Question about homework',
        created_date: '2024-01-15T14:00:00Z',
        is_read: false
      }
    ];
    const { UserMessage } = require('@/api/entities');
    UserMessage.filter.mockResolvedValue(messagesData);
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/recent messages/i)).toBeInTheDocument();
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });
  });

  test('shows assignment overview', async () => {
    const assignmentsData = [
      {
        id: 'assign1',
        title: 'Math Worksheet 1',
        course_id: 'course123',
        status: 'Graded',
        due_date: '2024-01-20T23:59:59Z'
      }
    ];
    const { Assignment } = require('@/api/entities');
    Assignment.filter.mockResolvedValue(assignmentsData);
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/recent assignments/i)).toBeInTheDocument();
      expect(screen.getByText('Math Worksheet 1')).toBeInTheDocument();
    });
  });

  test('handles Google Classroom connection errors', async () => {
    const { getGoogleAuthUrl } = require('@/api/functions');
    getGoogleAuthUrl.mockResolvedValue({
      data: { success: false, error: 'Authentication failed' }
    });
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect google classroom/i })).toBeInTheDocument();
    });
    
    // Click connect button
    const connectButton = screen.getByRole('button', { name: /connect google classroom/i });
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });

  test('allows disconnecting Google Classroom', async () => {
    const connectedTeacher = mockTeacher({ google_classroom_connected: true });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(connectedTeacher);
    const { handleGoogleDisconnect } = require('@/api/functions');
    handleGoogleDisconnect.mockResolvedValue({
      data: { success: true }
    });
    
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });
    
    // Click disconnect button
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);
    
    // Confirm disconnection
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(handleGoogleDisconnect).toHaveBeenCalledWith({
        teacher_user_id: connectedTeacher.id
      });
    });
    
    await expectToastMessage(/disconnected successfully/i);
  });
});
