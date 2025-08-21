
/* global describe, test, expect, beforeEach, waitFor */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUser, mockMessage, mockTeacher, fillForm, submitForm, expectToastMessage } from './TestUtils';
import Messages from '@/pages/Messages';

describe('Parent-Teacher Messaging', () => {
  beforeEach(() => {
    const userData = mockUser();
    const teacherData = mockTeacher();
    const messagesData = [
      mockMessage(),
      mockMessage({ 
        id: 'message456', 
        sender_id: 'teacher456', 
        recipient_id: 'user123',
        content: 'Thanks for reaching out! Your child is doing great.',
        is_read: true
      })
    ];
    
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    const { UserMessage } = require('@/api/entities');
    UserMessage.filter.mockResolvedValue(messagesData);
    User.filter.mockResolvedValue([teacherData]);
  });

  test('displays conversation list', async () => {
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
      expect(screen.getByText(/hello, I wanted to discuss/i)).toBeInTheDocument();
    });
  });

  test('shows unread message indicators', async () => {
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      // Should show unread indicator for unread messages
      expect(screen.getByText(/unread/i)).toBeInTheDocument();
    });
  });

  test('allows sending new message', async () => {
    const { UserMessage } = require('@/api/entities');
    UserMessage.create.mockResolvedValue({ success: true });
    
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
    
    // Click on conversation
    const conversation = screen.getByText('Ms. Johnson');
    fireEvent.click(conversation);
    
    // Type message
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(messageInput, { target: { value: 'How is my child progressing in math?' } });
    
    // Send message
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(UserMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'How is my child progressing in math?',
          recipient_id: 'teacher456',
          message_type: 'text'
        })
      );
    });
    
    await expectToastMessage(/message sent/i);
  });

  test('marks messages as read when opened', async () => {
    const { UserMessage } = require('@/api/entities');
    UserMessage.update.mockResolvedValue({ success: true });
    
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
    
    // Click on conversation with unread message
    const conversation = screen.getByText('Ms. Johnson');
    fireEvent.click(conversation);
    
    await waitFor(() => {
      expect(UserMessage.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          is_read: true
        })
      );
    });
  });

  test('allows starting new conversation', async () => {
    const { UserMessage } = require('@/api/entities');
    UserMessage.create.mockResolvedValue({ success: true });
    
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new message/i })).toBeInTheDocument();
    });
    
    // Click new message button
    const newMessageButton = screen.getByRole('button', { name: /new message/i });
    fireEvent.click(newMessageButton);
    
    // Select recipient
    const recipientSelect = screen.getByRole('combobox', { name: /select teacher/i });
    fireEvent.change(recipientSelect, { target: { value: 'teacher456' } });
    
    // Type message
    await fillForm({
      'message': 'I would like to schedule a meeting to discuss my child.'
    });
    
    // Send message
    await submitForm(/send/i);
    
    await waitFor(() => {
      expect(UserMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'I would like to schedule a meeting to discuss my child.',
          recipient_id: 'teacher456'
        })
      );
    });
  });

  test('handles message sending errors gracefully', async () => {
    const { UserMessage } = require('@/api/entities');
    UserMessage.create.mockRejectedValue(new Error('Failed to send'));
    
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
    
    // Click on conversation
    const conversation = screen.getByText('Ms. Johnson');
    fireEvent.click(conversation);
    
    // Try to send message
    const messageInput = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
    });
  });

  test('displays message timestamps correctly', async () => {
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
    
    // Click on conversation
    const conversation = screen.getByText('Ms. Johnson');
    fireEvent.click(conversation);
    
    // Should show formatted timestamps
    await waitFor(() => {
      expect(screen.getByText(/Jan 15/)).toBeInTheDocument(); // Based on mock date
    });
  });

  test('handles empty conversation list', async () => {
    const { UserMessage } = require('@/api/entities');
    UserMessage.filter.mockResolvedValue([]);
    
    renderWithProviders(<Messages />);
    
    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start a conversation/i })).toBeInTheDocument();
    });
  });
});
