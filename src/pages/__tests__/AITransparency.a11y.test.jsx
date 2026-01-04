import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import AITransparency from '@/pages/AITransparency.jsx';
import { graphql } from '@/lib/graphql';

expect.extend(toHaveNoViolations);

jest.mock('@/lib/graphql', () => ({
  graphql: jest.fn()
}));

test('AI transparency page passes basic a11y checks', async () => {
  graphql.mockResolvedValue({
    ai_policy_docs: [
      {
        id: 'doc-1',
        slug: 'ai-purpose',
        title: 'AI Purpose',
        summary: 'Summary',
        content: 'Content text',
        links: ['https://teachmo.com/ai'],
        published_at: new Date().toISOString(),
      }
    ]
  });

  const queryClient = new QueryClient();
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <AITransparency />
    </QueryClientProvider>
  );

  await screen.findByText('AI Purpose');
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
