import React, { useState, useEffect } from 'react';
import { UserOfferSave, PartnerOffer, Partner } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OfferCard from './OfferCard';
import { EmptyState } from '../shared/LoadingStates';

export default function SavedOffers() {
  const [savedOffers, setSavedOffers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedOffers();
  }, []);

  const loadSavedOffers = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      // Get user's saved offers
      const saves = await UserOfferSave.filter({
        user_id: userData.id
      }, '-created_date');
      setSavedOffers(saves);

      if (saves.length > 0) {
        // Get offer details
        const offerIds = saves.map(save => save.offer_id);
        const offersData = await Promise.all(
          offerIds.map(id => PartnerOffer.filter({ id }).catch(() => null))
        );
        const validOffers = offersData.filter(Boolean).flat();

        // Get partner details
        const partnerIds = [...new Set(validOffers.map(offer => offer.partner_id))];
        const partnersData = await Promise.all(
          partnerIds.map(id => Partner.filter({ id }).catch(() => null))
        );
        const validPartners = partnersData.filter(Boolean).flat();

        setOffers(validOffers);
        setPartners(validPartners);
      }
    } catch (error) {
      console.error('Failed to load saved offers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load saved offers.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (offerId) => {
    try {
      const save = savedOffers.find(s => s.offer_id === offerId);
      if (save) {
        await UserOfferSave.delete(save.id);
        toast({
          title: 'Offer Removed',
          description: 'Offer has been removed from your saved list.'
        });
        loadSavedOffers();
      }
    } catch (error) {
      console.error('Failed to remove saved offer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove offer.'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (savedOffers.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No Saved Offers"
        description="Save offers you're interested in to find them here later."
        action={null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-bold">Saved Offers</h2>
        </div>
        <span className="text-sm text-gray-600">
          {savedOffers.length} offer{savedOffers.length !== 1 ? 's' : ''} saved
        </span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map(offer => {
          const partner = partners.find(p => p.id === offer.partner_id);
          return (
            <div key={offer.id} className="relative">
              <OfferCard 
                offer={offer}
                partner={partner}
                onUpdate={loadSavedOffers}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemove(offer.id)}
                className="absolute top-2 left-2 bg-white/90 hover:bg-white"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}