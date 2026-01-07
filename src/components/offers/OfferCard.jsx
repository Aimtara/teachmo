import React, { useState, useEffect } from 'react';
import { UserOfferSave, PartnerOffer } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Clock, ExternalLink, Building2, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isAfter, differenceInDays } from 'date-fns';
import { createLogger } from '@/utils/logger';

const logger = createLogger('offer-card');

export default function OfferCard({ offer, partner, onUpdate, compact = false }) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUserAndSaveStatus();
  }, [offer.id]);

  const loadUserAndSaveStatus = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      // Check if offer is saved
      const saves = await UserOfferSave.filter({
        user_id: userData.id,
        offer_id: offer.id
      });
      setIsSaved(saves.length > 0);
    } catch (error) {
      logger.error('Failed to load user save status', error);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) return;

    setIsLoading(true);
    try {
      if (isSaved) {
        // Remove save
        const saves = await UserOfferSave.filter({
          user_id: user.id,
          offer_id: offer.id
        });
        if (saves.length > 0) {
          await UserOfferSave.delete(saves[0].id);
        }
        setIsSaved(false);
        toast({
          title: 'Offer Removed',
          description: 'Offer has been removed from your saved list.'
        });
      } else {
        // Add save
        await UserOfferSave.create({
          user_id: user.id,
          offer_id: offer.id
        });
        setIsSaved(true);
        toast({
          title: 'Offer Saved!',
          description: 'You can find this offer in your saved deals.'
        });

        // Update offer saves count
        await PartnerOffer.update(offer.id, {
          saves: (offer.saves || 0) + 1
        });
      }
      onUpdate?.();
    } catch (error) {
      logger.error('Failed to save offer', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save offer. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    try {
      // Track click
      await PartnerOffer.update(offer.id, {
        clicks: (offer.clicks || 0) + 1
      });

      // Open redemption URL
      if (offer.redemption_url) {
        window.open(offer.redemption_url, '_blank');
      }
    } catch (error) {
      logger.error('Failed to track click', error);
    }
  };

  const daysUntilExpiry = differenceInDays(new Date(offer.end_date), new Date());
  const isExpiringSoon = daysUntilExpiry <= 3;
  const isExpired = daysUntilExpiry < 0;

  if (isExpired) return null;

  return (
    <Card className={`${compact ? 'w-64' : 'w-80'} cursor-pointer hover:shadow-lg transition-shadow duration-200`}>
      <CardContent className="p-0">
        <div 
          className="relative overflow-hidden"
          onClick={handleClick}
        >
          {/* Background Image or Gradient */}
          <div className={`${compact ? 'h-32' : 'h-40'} bg-gradient-to-br from-purple-500 to-pink-500 relative`}>
            {offer.image_url && (
              <img 
                src={offer.image_url} 
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-20" />
            
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                isSaved 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* Discount Badge */}
            <div className="absolute top-3 left-3">
              <Badge className="bg-green-500 text-white font-bold">
                {offer.discount_value}
              </Badge>
            </div>

            {/* Expiry Warning */}
            {isExpiringSoon && (
              <div className="absolute bottom-3 left-3">
                <Badge variant="destructive" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Partner Info */}
            <div className="flex items-center gap-2 mb-2">
              {partner?.logo_url ? (
                <img 
                  src={partner.logo_url} 
                  alt={partner.organization_name}
                  className="w-6 h-6 object-contain rounded"
                />
              ) : (
                <Building2 className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-600">
                {partner?.organization_name || 'Partner'}
              </span>
            </div>

            {/* Offer Title */}
            <h3 className={`font-bold text-gray-900 mb-2 ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
              {offer.title}
            </h3>

            {/* Description */}
            {!compact && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {offer.description}
              </p>
            )}

            {/* Pricing */}
            {offer.original_price && offer.discounted_price && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-green-600">
                  {offer.discounted_price}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {offer.original_price}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                Until {format(new Date(offer.end_date), 'MMM d')}
              </div>
              
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                <ExternalLink className="w-3 h-3 mr-1" />
                Get Deal
              </Button>
            </div>

            {/* Promo Code */}
            {offer.promo_code && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-center">
                <span className="text-xs text-gray-600">Code: </span>
                <span className="font-mono font-bold text-sm">{offer.promo_code}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
