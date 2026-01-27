import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ExternalLink, Bookmark, Clock, AlertTriangle } from 'lucide-react';
import { PartnerOffer } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, parseISO } from 'date-fns';
import { withGracefulDegradation } from '@/components/shared/apiUtils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('offers-carousel');

export default function OffersCarousel() {
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use graceful degradation for offers - if it fails, just show empty array
      const offersData = await withGracefulDegradation(
        () => PartnerOffer.filter({ 
          status: 'published',
          end_date: { $gte: new Date().toISOString() }
        }, '-created_date', 10),
        [] // Fallback to empty array
      );
      
      setOffers(offersData || []);
    } catch (err) {
      logger.warn('Failed to load offers', err);
      setOffers([]); // Graceful fallback
      setError('Unable to load special offers at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextOffer = () => {
    setCurrentIndex((prev) => (prev + 1) % offers.length);
  };

  const prevOffer = () => {
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
  };

  // Auto-advance carousel
  useEffect(() => {
    if (offers.length <= 1) return;
    
    const interval = setInterval(nextOffer, 8000);
    return () => clearInterval(interval);
  }, [offers.length]);

  // Don't render anything if loading failed or no offers
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Loading special offers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no offers or error, don't show the carousel at all
  if (error || offers.length === 0) {
    return null; // Graceful degradation - just don't show anything
  }

  const currentOffer = offers[currentIndex];
  const isExpiringSoon = currentOffer.end_date && 
    isAfter(parseISO(currentOffer.end_date), new Date()) && 
    isAfter(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), parseISO(currentOffer.end_date));

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          {/* Navigation arrows - only show if multiple offers */}
          {offers.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white"
                onClick={prevOffer}
                aria-label="Previous offer"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white"
                onClick={nextOffer}
                aria-label="Next offer"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-600 text-white px-3 py-1">
                      {currentOffer.discount_value} OFF
                    </Badge>
                    {isExpiringSoon && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {currentOffer.title}
                  </h3>
                  
                  <p className="text-gray-700 mb-3 line-clamp-2">
                    {currentOffer.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <span>Valid until: {format(parseISO(currentOffer.end_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {currentOffer.image_url && (
                  <div className="ml-4 flex-shrink-0">
                    <img 
                      src={currentOffer.image_url} 
                      alt={currentOffer.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => window.open(currentOffer.redemption_url, '_blank')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Get Offer
                  </Button>
                  
                  {currentOffer.promo_code && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Code:</span>
                      <Badge variant="outline" className="font-mono">
                        {currentOffer.promo_code}
                      </Badge>
                    </div>
                  )}
                </div>

                {offers.length > 1 && (
                  <div className="flex items-center gap-1">
                    {offers.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentIndex ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                        onClick={() => setCurrentIndex(index)}
                        aria-label={`Go to offer ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
