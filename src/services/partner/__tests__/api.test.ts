import { describe, expect, it, vi } from 'vitest';

const { filter } = vi.hoisted(() => ({
  filter: vi.fn()
}));

vi.mock('../../core/client', () => ({
  apiClient: {
    entity: {
      filter
    }
  }
}));

import { PartnerService } from '../api';

describe('PartnerService', () => {
  it('selects the matching partner for a user', async () => {
    filter.mockImplementation((name: string) => {
      if (name === 'Partner') {
        return Promise.resolve([
          { id: 'partner-1', owner_id: 'user-2' },
          { id: 'partner-2', owner_id: 'user-1' }
        ]);
      }
      return Promise.resolve([]);
    });

    const partner = await PartnerService.getPartnerForUser('user-1');

    expect(partner).toEqual({ id: 'partner-2', owner_id: 'user-1' });
  });

  it('loads offers for a partner', async () => {
    filter.mockImplementation((name: string) => {
      if (name === 'PartnerOffer') {
        return Promise.resolve([{ id: 'offer-1', partner_id: 'partner-1' }]);
      }
      return Promise.resolve([]);
    });

    const offers = await PartnerService.getOffersByPartnerId('partner-1');

    expect(offers).toEqual([{ id: 'offer-1', partner_id: 'partner-1' }]);
  });
});
