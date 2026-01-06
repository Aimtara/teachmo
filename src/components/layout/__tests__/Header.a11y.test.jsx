import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Header from '../Header';
import { I18nProvider } from '@/components/shared/InternationalizationProvider';

expect.extend(toHaveNoViolations);

const mockUser = {
  full_name: 'Alex Doe',
  email: 'alex@example.com',
  role: 'teacher',
  login_streak: 4,
};

test('Header passes basic accessibility checks', async () => {
  const { container } = render(
    <I18nProvider enabled defaultLocale="en">
      <MemoryRouter>
        <Header user={mockUser} onLogout={() => {}} />
      </MemoryRouter>
    </I18nProvider>
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
