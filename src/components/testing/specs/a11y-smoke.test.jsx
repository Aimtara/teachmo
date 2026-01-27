import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('a11y smoke', () => {
  it('has no obvious violations (smoke)', async () => {
    const { container } = render(
      <div>
        <button aria-label="ok">OK</button>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
