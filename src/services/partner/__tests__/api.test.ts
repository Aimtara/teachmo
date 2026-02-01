import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the base44 client with dynamic entity access using Proxy
vi.mock('@/api/base44/client', () => {
  const mockPartnerFilter = vi.fn();
  const mockPartnerOfferFilter = vi.fn();

  const entities = {
    Partner: {
      filter: mockPartnerFilter,
    },
    PartnerOffer: {
      filter: mockPartnerOfferFilter,
    },
  };

  return {
    base44: {
      entities: new Proxy(entities, {
        get(target, prop) {
          // Support dynamic entity access pattern used by getEntityClient
          return target[prop as keyof typeof target];
        },
      }),
    },
  };
});

import { PartnerService } from '../api';
import { base44 } from '@/api/base44/client';

describe('PartnerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the matching partner for a user', async () => {
    const mockPartnerFilter = base44.entities.Partner.filter as ReturnType<typeof vi.fn>;
    mockPartnerFilter.mockResolvedValue([
      { id: 'partner-1', owner_id: 'user-2' },
      { id: 'partner-2', owner_id: 'user-1' },
    ]);

    const partner = await PartnerService.getPartnerForUser('user-1');

    expect(partner).toEqual({ id: 'partner-2', owner_id: 'user-1' });
  });

  it('loads offers for a partner', async () => {
    const mockPartnerOfferFilter = base44.entities.PartnerOffer.filter as ReturnType<typeof vi.fn>;
    mockPartnerOfferFilter.mockResolvedValue([{ id: 'offer-1', partner_id: 'partner-1' }]);

    const offers = await PartnerService.getOffersByPartnerId('partner-1');

    expect(offers).toEqual([{ id: 'offer-1', partner_id: 'partner-1' }]);
  });
});
