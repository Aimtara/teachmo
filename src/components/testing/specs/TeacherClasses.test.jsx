import React from 'react';
import { renderWithProviders, screen, axe } from '../TestUtils';
import { I18nProvider } from '@/components/shared/InternationalizationProvider';
import TeacherClasses from '@/pages/TeacherClasses';

jest.mock('@/components/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@/api/entities', () => ({
  Course: {
    filter: jest.fn().mockResolvedValue([]),
  },
  Enrollment: {
    filter: jest.fn().mockResolvedValue([]),
  },
}));

describe('TeacherClasses page', () => {
  it('renders translated header and is accessible', async () => {
    const { container } = renderWithProviders(
      <I18nProvider defaultLocale="en">
        <TeacherClasses />
      </I18nProvider>
    );

    expect(
      await screen.findByRole('heading', { name: /My Classes|Mis Clases/i })
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
