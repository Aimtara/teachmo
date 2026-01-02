import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { base44 } from '@/api/base44Client';
import { PartnerOffer } from '@/api/entities';
import PartnerOfferForm from '@/components/partner/PartnerOfferForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoading } from '@/components/shared/StandardLoadingStates';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

function PartnerOffersContent() {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const currentUser = await base44.auth.me();
        const allPartners = await base44.entities.Partner.filter({});
        const userPartner =
          (allPartners || []).find((p) =>
            p.owner_id ? p.owner_id === currentUser.id : p.user_id === currentUser.id
          ) || (allPartners || [])[0];
        setPartner(userPartner || null);
        if (userPartner) {
          const partnerOffers = await PartnerOffer.filter({ partner_id: userPartner.id });
          setOffers(partnerOffers || []);
        }
      } catch (error) {
        console.error('Failed to load offers data:', error);
        ultraMinimalToast.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const refreshOffers = async () => {
    if (!partner) return;
    try {
      const partnerOffers = await PartnerOffer.filter({ partner_id: partner.id });
      setOffers(partnerOffers || []);
    } catch (error) {
      console.error('Failed to refresh offers:', error);
      ultraMinimalToast.error('Failed to refresh offers');
    }
  };

  if (loading) {
    return <PageLoading label="Loading offers..." />;
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Become a Teachmo Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              To manage offers and discounts, you'll need to submit a partner application
              and be approved by an administrator. Please visit the Partner Portal to
              start your submission.
            </p>
            <a
              href="/partners"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Partner Portal
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Your Offers</h1>
          <p className="text-gray-600">
            Create, edit and manage special offers, discounts and promotions for
            Teachmo families. Use clear descriptions and appropriate terms to
            attract the right audience.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <PartnerOfferForm partner={partner} offers={offers} onUpdate={refreshOffers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PartnerOffers() {
  return (
    <ProtectedRoute
      allowedRoles={['partner', 'admin', 'system_admin']}
      requireAuth={true}
    >
      <PartnerOffersContent />
    </ProtectedRoute>
  );
}
