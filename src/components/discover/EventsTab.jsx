import React, { useState, useEffect } from 'react';
import { LocalEvent, PartnerEvent } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Search, Map, List } from 'lucide-react';
import { ListLoadingSkeleton, ErrorState, EmptyState } from '@/components/shared/LoadingStates';
import LocalEventCard from '@/components/discover/LocalEventCard';
import { useDebounce } from '@/components/hooks/useDebounce';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Placeholder for MapView to avoid breaking the build if it's not ready
const MapView = () => (
    <div className="h-96 w-full bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Map view is coming soon!</p>
    </div>
);


export default function EventsTab({ initialQuery }) {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState('list');
  const api = useApi({ context: 'events' });

  useEffect(() => {
    fetchEvents();
  }, [debouncedSearchTerm]);

  const fetchEvents = async () => {
    const query = {
      ...(debouncedSearchTerm && { title: { $ilike: `%${debouncedSearchTerm}%` } }),
    };

    const data = await api.execute(
      async () => {
        const localEvents = await LocalEvent.filter(query, '-start_time', 25);
        const partnerEvents = await PartnerEvent.filter({...query, status: 'published'}, '-start_time', 25);
        return [...localEvents, ...partnerEvents].sort((a,b) => new Date(b.start_time) - new Date(a.start_time));
      },
      { key: 'events', errorContext: 'loading events' }
    );
    if (data) {
      setEvents(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-inherit py-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search events by name or location..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
                <List className="w-5 h-5" />
                <Switch
                    checked={viewMode === 'map'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'map' : 'list')}
                    id="map-view-toggle"
                />
                <Map className="w-5 h-5" />
                <Label htmlFor="map-view-toggle" className="sr-only">Toggle Map View</Label>
            </div>
        </div>
      </div>
      
      { viewMode === 'map' ? (
          <MapView events={events} />
      ) : api.isLoading('events') ? (
        <ListLoadingSkeleton items={4} cardType="event" />
      ) : api.hasError('events') ? (
        <ErrorState error={api.getError('events')} onRetry={fetchEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Events Found"
          description="We couldn't find any events matching your search. Try a different keyword."
        />
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <LocalEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}