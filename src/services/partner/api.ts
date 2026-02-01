import { apiClient } from '../core/client';
import type { Partner, PartnerOffer } from './types';

export const PartnerService = {
  async getPartnerForUser(userId: string): Promise<Partner | null> {
    const partners = await apiClient.entity.filter<Partner>('Partner', {});
    if (!Array.isArray(partners) || partners.length === 0) {
      return null;
    }

    const match =
      partners.find((partner) =>
        partner.owner_id ? partner.owner_id === userId : partner.user_id === userId
      ) ?? partners[0];

    return match;
  },
  getOffersByPartnerId: (partnerId: string) =>
    apiClient.entity.filter<PartnerOffer>('PartnerOffer', { partner_id: partnerId }),
};
