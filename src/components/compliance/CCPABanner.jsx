import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CCPABanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const dismissed = localStorage.getItem('ccpa-banner-dismissed');
    if (dismissed) return;

    // Simple IP-based location check (in production, use a proper geolocation service)
    const checkUserLocation = async () => {
      try {
        // This is a simplified check - in production, use a proper geolocation API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.region_code === 'CA' || data.country_code === 'US') {
          setUserLocation('CA');
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Location check failed:', error);
        // Show banner anyway for safety
        setIsVisible(true);
      }
    };

    checkUserLocation();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ccpa-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-900 text-white p-4 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <strong>Your Privacy Rights:</strong> California residents have the right to know what personal 
            information is collected and how it's used. You can opt-out of the sale of your personal information.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to={createPageUrl('PrivacyRights')}>
            <Button variant="outline" size="sm" className="bg-white text-blue-900 hover:bg-gray-100">
              <ExternalLink className="w-4 h-4 mr-2" />
              Your Rights
            </Button>
          </Link>
          
          <Link to={createPageUrl('DoNotSell')}>
            <Button variant="outline" size="sm" className="bg-white text-blue-900 hover:bg-gray-100">
              Do Not Sell My Info
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-blue-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}