
/* global describe, test, expect, beforeEach, waitFor */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUser, mockChild, fillForm, submitForm, expectToastMessage } from './TestUtils';
import Welcome from '@/pages/Welcome';

describe('Child Management', () => {
  beforeEach(() => {
    const userData = mockUser({ onboarding_completed: false });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    const { Child } = require('@/api/entities');
    Child.list.mockResolvedValue([]);
  });

  test('allows adding a new child during onboarding', async () => {
    const { Child } = require('@/api/entities');
    Child.create.mockResolvedValue(mockChild());
    
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText(/add your first child/i)).toBeInTheDocument();
    });
    
    // Fill out child form
    await fillForm({
      'name': 'Test Child',
      'birth date': '2017-03-15',
      'grade level': '2nd Grade',
      'school name': 'Test Elementary'
    });
    
    // Select learning style
    const visualButton = screen.getByRole('button', { name: /visual/i });
    fireEvent.click(visualButton);
    
    // Submit form
    await submitForm(/add child/i);
    
    await waitFor(() => {
      expect(Child.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Child',
          birth_date: '2017-03-15',
          grade_level: '2nd Grade',
          school_name: 'Test Elementary',
          learning_style: 'visual'
        })
      );
    });
    
    await expectToastMessage(/child profile created/i);
  });

  test('validates required fields when adding child', async () => {
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText(/add your first child/i)).toBeInTheDocument();
    });
    
    // Try to submit without required fields
    await submitForm(/add child/i);
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/birth date is required/i)).toBeInTheDocument();
    });
  });

  test('calculates age correctly from birth date', async () => {
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText(/add your first child/i)).toBeInTheDocument();
    });
    
    // Fill birth date
    const birthDateInput = screen.getByLabelText(/birth date/i);
    fireEvent.change(birthDateInput, { target: { value: '2017-03-15' } });
    
    // Should show calculated age
    await waitFor(() => {
      expect(screen.getByText(/7 years old/i)).toBeInTheDocument();
    });
  });

  test('handles multiple children management', async () => {
    const childrenData = [
      mockChild({ id: 'child1', name: 'First Child', age: 7 }),
      mockChild({ id: 'child2', name: 'Second Child', age: 5 })
    ];
    const { Child } = require('@/api/entities');
    Child.list.mockResolvedValue(childrenData);
    
    const userData = mockUser({ onboarding_completed: true });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
    });
  });

  test('allows editing existing child information', async () => {
    const existingChild = mockChild();
    const { Child } = require('@/api/entities');
    Child.list.mockResolvedValue([existingChild]);
    Child.update.mockResolvedValue({ ...existingChild, name: 'Updated Name' });
    
    const userData = mockUser({ onboarding_completed: true });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText(existingChild.name)).toBeInTheDocument();
    });
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    // Update name
    const nameInput = screen.getByDisplayValue(existingChild.name);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    // Save changes
    await submitForm(/save/i);
    
    await waitFor(() => {
      expect(Child.update).toHaveBeenCalledWith(
        existingChild.id,
        expect.objectContaining({
          name: 'Updated Name'
        })
      );
    });
  });

  test('handles child deletion with confirmation', async () => {
    const existingChild = mockChild();
    const { Child } = require('@/api/entities');
    Child.list.mockResolvedValue([existingChild]);
    Child.delete.mockResolvedValue({ success: true });
    
    const userData = mockUser({ onboarding_completed: true });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    
    renderWithProviders(<Welcome />);
    
    await waitFor(() => {
      expect(screen.getByText(existingChild.name)).toBeInTheDocument();
    });
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(Child.delete).toHaveBeenCalledWith(existingChild.id);
    });
    
    await expectToastMessage(/child profile deleted/i);
  });
});
