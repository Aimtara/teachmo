/* eslint-env jest */
import { checkCampaignLimits } from '../utils/campaignLimits.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

describe('campaign limits', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('bypasses emergency category', async () => {
    const result = await checkCampaignLimits('tenant-1', 'emergency');
    expect(result).toEqual({ allowed: true });
    expect(query).not.toHaveBeenCalled();
  });

  test('blocks when limit is reached', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
    const result = await checkCampaignLimits('tenant-1', 'fundraising');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Fundraising messages are limited to 2 per week/);
  });

  test('allows when under limit', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const result = await checkCampaignLimits('tenant-1', 'general');
    expect(result).toEqual({ allowed: true });
  });
});
