/* eslint-env jest */
import { scanContent } from '../utils/contentSafety.js';

describe('contentSafety scanner', () => {
  test('returns safe for clean content', () => {
    const result = scanContent({ title: 'Literacy Workshop', description: 'Family night with free books.' });
    expect(result.isSafe).toBe(true);
    expect(result.flags).toEqual([]);
  });

  test('flags SSN/email/high-pressure language', () => {
    const result = scanContent({
      title: 'Act now',
      description: 'Email us at test@example.com with SSN 123-45-6789 to buy immediately.'
    });

    expect(result.isSafe).toBe(false);
    expect(result.flags).toContain('Potential SSN detected');
    expect(result.flags).toContain('PII: Email addresses detected in public content');
    expect(result.flags).toContain('Tone: High-pressure sales language detected');
  });
});
