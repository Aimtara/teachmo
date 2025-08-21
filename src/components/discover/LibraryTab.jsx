
import React, { useState, useEffect } from 'react';
import { LibraryResource } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ListLoadingSkeleton, ErrorState, EmptyState } from '@/components/shared/LoadingStates';
import ResourceCard from '@/components/library/ResourceCard';
import LibraryFilters from '@/components/library/LibraryFilters';
import { useDebounce } from '@/components/hooks/useDebounce';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // New imports
import ShortsDiscoverTab from './ShortsDiscoverTab'; // Assuming ShortsDiscoverTab is in the same directory

export default function LibraryTab({ initialQuery }) {
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');
  const [filters, setFilters] = useState({
    categories: [],
    types: [],
    difficulty: null
  });
  const [activeTab, setActiveTab] = useState('library'); // State for managing active tab

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const api = useApi({ context: 'library' });

  // Only fetch resources for the 'library' tab
  useEffect(() => {
    if (activeTab === 'library') {
      fetchResources();
    }
  }, [debouncedSearchTerm, filters, activeTab]);

  const fetchResources = async () => {
    const query = {
      ...(debouncedSearchTerm && { title: { $ilike: `%${debouncedSearchTerm}%` } }),
      ...buildFilterQuery(filters),
    };
    
    const data = await api.execute(
      () => LibraryResource.filter(query, '-created_date', 50),
      { key: 'resources', errorContext: 'loading resources' }
    );
    if (data) {
      setResources(data);
    }
  };

  const buildFilterQuery = (filterState) => {
    const query = {};
    
    if (filterState.categories && filterState.categories.length > 0) {
      query.category = { $in: filterState.categories };
    }
    
    if (filterState.types && filterState.types.length > 0) {
      query.type = { $in: filterState.types };
    }
    
    if (filterState.difficulty) {
      query.difficulty = filterState.difficulty;
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
      types: [],
      difficulty: null
    });
  };

  const tabContentClasses = 'mt-4'; // Define a class for tab content spacing

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="library">Library Resources</TabsTrigger>
        <TabsTrigger value="shorts">Teachmo Shorts</TabsTrigger>
      </TabsList>

      <TabsContent value="library" className={tabContentClasses}>
        <div className="space-y-6">
          <div className="sticky top-0 z-10 bg-inherit py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search library resources..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <LibraryFilters 
              currentFilters={filters} 
              onFilterChange={handleFilterChange} 
              onReset={handleResetFilters}
            />
          </div>

          {api.isLoading('resources') ? (
            <ListLoadingSkeleton items={9} cardType="resource" />
          ) : api.hasError('resources') ? (
            <ErrorState error={api.getError('resources')} onRetry={fetchResources} />
          ) : resources.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Resources Found"
              description="Try adjusting your search or filters to find helpful resources."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="shorts" className={tabContentClasses}>
        <div className="space-y-6">
          <ShortsDiscoverTab 
            initialQuery={initialQuery}
            appliedFilters={filters} // Pass current filters to ShortsDiscoverTab
            onFiltersChange={handleFilterChange} // Pass filter change handler to ShortsDiscoverTab
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
