import type { Partner, PartnerOffer } from '@/services/partner/types';

interface PartnerOfferFormProps {
  partner: Partner;
  offers?: PartnerOffer[];
  onUpdate?: () => void | Promise<void>;
}

declare function PartnerOfferForm(props: PartnerOfferFormProps): JSX.Element;

export default PartnerOfferForm;
