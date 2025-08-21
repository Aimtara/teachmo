import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Activity,
  MapPin,
  Heart,
  Lightbulb,
  Play
} from 'lucide-react';

const INTENT_MAPPINGS = {
  // Activities
  'find_activities': {
    page: 'UnifiedDiscover',
    tab: 'activities',
    icon: Activity,
    label: 'Browse Activities',
    description: 'Discover fun activities for your children'
  },
  'creative_activities': {
    page: 'UnifiedDiscover',
    tab: 'activities',
    filters: { categories: ['creative', 'art'] },
    icon: Activity,
    label: 'Creative Activities',
    description: 'Art, crafts, and creative projects'
  },
  'outdoor_activities': {
    page: 'UnifiedDiscover',
    tab: 'activities',
    filters: { categories: ['outdoor', 'physical'] },
    icon: Activity,
    label: 'Outdoor Fun',
    description: 'Get outside and be active'
  },
  'educational_activities': {
    page: 'UnifiedDiscover',
    tab: 'activities',
    filters: { categories: ['educational', 'science'] },
    icon: BookOpen,
    label: 'Learning Activities',
    description: 'Educational games and experiments'
  },

  // Library Resources
  'parenting_tips': {
    page: 'UnifiedDiscover',
    tab: 'library',
    filters: { categories: ['communication', 'discipline'] },
    icon: Lightbulb,
    label: 'Parenting Tips',
    description: 'Expert advice and strategies'
  },
  'child_development': {
    page: 'UnifiedDiscover',
    tab: 'library',
    filters: { categories: ['development', 'education'] },
    icon: BookOpen,
    label: 'Development Guide',
    description: 'Understanding child growth'
  },
  'behavior_help': {
    page: 'UnifiedDiscover',
    tab: 'library',
    filters: { categories: ['discipline', 'emotional_intelligence'] },
    icon: Heart,
    label: 'Behavior Support',
    description: 'Managing challenging behaviors'
  },

  // Events
  'local_events': {
    page: 'UnifiedDiscover',
    tab: 'events',
    icon: MapPin,
    label: 'Local Events',
    description: 'Family-friendly events near you'
  },
  'playdates': {
    page: 'UnifiedDiscover',
    tab: 'events',
    filters: { type: 'playdate' },
    icon: Users,
    label: 'Playdates',
    description: 'Connect with other families'
  },

  // Community
  'join_community': {
    page: 'UnifiedCommunity',
    tab: 'feed',
    icon: Users,
    label: 'Join Community',
    description: 'Connect with other parents'
  },
  'find_pods': {
    page: 'UnifiedCommunity',
    tab: 'pods',
    icon: Users,
    label: 'Parent Pods',
    description: 'Join or create parent groups'
  },

  // Calendar/Planning
  'schedule_activities': {
    page: 'Calendar',
    icon: Calendar,
    label: 'Plan Schedule',
    description: 'Organize your family time'
  },

  // Default fallback
  'browse_all': {
    page: 'UnifiedDiscover',
    tab: 'recommendations',
    icon: Play,
    label: 'Browse All',
    description: 'Explore everything Teachmo offers'
  }
};

export default function IntentRouter({ intents = [], onNavigate }) {
  const navigate = useNavigate();

  const handleNavigation = (intent) => {
    const mapping = INTENT_MAPPINGS[intent] || INTENT_MAPPINGS['browse_all'];
    
    // Build URL with query parameters for filters and tab
    let url = createPageUrl(mapping.page);
    const params = new URLSearchParams();
    
    if (mapping.tab) {
      params.set('tab', mapping.tab);
    }
    
    if (mapping.filters) {
      Object.entries(mapping.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value);
        }
      });
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    if (onNavigate) {
      onNavigate(mapping);
    }
    
    navigate(url);
  };

  if (intents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Quick Actions:
      </div>
      <div className="flex flex-wrap gap-2">
        {intents.slice(0, 6).map((intent, index) => {
          const mapping = INTENT_MAPPINGS[intent] || INTENT_MAPPINGS['browse_all'];
          const Icon = mapping.icon;
          
          return (
            <Button
              key={intent}
              variant="outline"
              size="sm"
              onClick={() => handleNavigation(intent)}
              className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-200"
            >
              <Icon className="w-4 h-4" />
              {mapping.label}
            </Button>
          );
        })}
      </div>
      
      {intents.length > 6 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleNavigation('browse_all')}
          className="text-blue-600 hover:text-blue-700"
        >
          View More Options →
        </Button>
      )}
    </div>
  );
}