import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Clock, Package, MapPin } from 'lucide-react';

const quickFilters = [
  { label: 'Quick & Easy', icon: Zap, filter: { duration: '0-15', materials_needed: [] } },
  { label: 'Under 30 Mins', icon: Clock, filter: { duration: '15-30' } },
  { label: 'No Materials', icon: Package, filter: { materials_needed: [] } },
  { label: 'Nearby Events', icon: MapPin, filter: { location: 'nearby' } },
];

export default function QuickFilters({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map((item) => (
        <Button
          key={item.label}
          variant="outline"
          size="sm"
          className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-gray-100"
          onClick={() => onSelect(item.filter)}
        >
          <item.icon className="w-4 h-4 mr-2" />
          {item.label}
        </Button>
      ))}
    </div>
  );
}