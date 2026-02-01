import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44/client', () => ({
  base44: {
    entities: {
      Partner: {
        filter: vi.fn(),
      },
      PartnerOffer: {
        filter: vi.fn(),
      },
    },
  },
}));

import { PartnerService } from '../api';
import { base44 } from '@/api/base44/client';

describe('PartnerService', () => {
  it('selects the matching partner for a user', async () => {
    const partnerFilter = base44.entities.Partner.filter as unknown as ReturnType<typeof vi.fn>;
    partnerFilter.mockResolvedValue([
      { id: 'partner-1', owner_id: 'user-2' },
      { id: 'partner-2', owner_id: 'user-1' },
    ]);

    const partner = await PartnerService.getPartnerForUser('user-1');

    // Verify filter is called with empty object to fetch all partners
    // (implementation filters in-memory to support both owner_id and user_id fields)
    expect(partnerFilter).toHaveBeenCalledWith({});
    expect(partner).toEqual({ id: 'partner-2', owner_id: 'user-1' });
  });

  it('loads offers for a partner', async () => {
    const offerFilter = base44.entities.PartnerOffer.filter as unknown as ReturnType<typeof vi.fn>;
    offerFilter.mockResolvedValue([{ id: 'offer-1', partner_id: 'partner-1' }]);

    const offers = await PartnerService.getOffersByPartnerId('partner-1');

    // Verify filter is called with partner_id parameter
    expect(offerFilter).toHaveBeenCalledWith({ partner_id: 'partner-1' });
    expect(offers).toEqual([{ id: 'offer-1', partner_id: 'partner-1' }]);
  });
});
