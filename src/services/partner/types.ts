export interface Partner {
  id: string;
  owner_id?: string | null;
  user_id?: string | null;
  [key: string]: unknown;
}

export interface PartnerOffer {
  id: string;
  partner_id: string;
  [key: string]: unknown;
}
