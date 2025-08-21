import React, { useState, useEffect } from 'react';
import { Activity } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ListLoadingSkeleton, ErrorState, EmptyState } from '@/components/shared/LoadingStates';
import ActivityCard from '@/components/activities/ActivityCard';
import ActivityFilters from '@/components/activities/ActivityFilters';
import { useDebounce } from '@/components/hooks/useDebounce';

export default function ActivitiesTab({ initialQuery }) {
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');
  const [filters, setFilters] = useState({
    categories: [],
    duration: null,
    age: null
  });
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const api = useApi({ context: 'activities' });

  useEffect(() => {
    fetchActivities();
  }, [debouncedSearchTerm, filters]);

  const fetchActivities = async () => {
    const query = {
      ...(debouncedSearchTerm && { title: { $ilike: `%${debouncedSearchTerm}%` } }),
      ...buildFilterQuery(filters),
    };
    
    const data = await api.execute(
      () => Activity.filter(query, '-created_date', 50),
      { key: 'activities', errorContext: 'loading activities' }
    );
    if (data) {
      setActivities(data);
    }
  };

  const buildFilterQuery = (filterState) => {
    const query = {};
    
    if (filterState.categories && filterState.categories.length > 0) {
      query.category = { $in: filterState.categories };
    }
    
    if (filterState.duration) {
      // Convert duration filter to actual query
      switch (filterState.duration) {
        case '<15 min':
          query.duration = { $ilike: '%15%' };
          break;
        case '15-30 min':
          query.duration = { $ilike: '%30%' };
          break;
        case '30-60 min':
          query.duration = { $ilike: '%60%' };
          break;
        case '>60 min':
          query.duration = { $not: { $ilike: '%15%' } };
          break;
      }
    }
    
    return query;
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      categories: [],
      duration: null,
      age: null
    });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-inherit py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search activities..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ActivityFilters 
          currentFilters={filters} 
          onFilterChange={handleFilterChange} 
          onReset={handleResetFilters}
        />
      </div>

      {api.isLoading('activities') ? (
        <ListLoadingSkeleton items={9} cardType="activity" />
      ) : api.hasError('activities') ? (
        <ErrorState error={api.getError('activities')} onRetry={fetchActivities} />
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Activities Found"
          description="Try adjusting your search or filters to find the perfect activity."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
