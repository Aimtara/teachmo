import React, { useState, useEffect } from 'react';
import { Activity, LibraryResource } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import { ListLoadingSkeleton, ErrorState, EmptyState } from '@/components/shared/LoadingStates';
import ActivityCard from '@/components/activities/ActivityCard';
import ResourceCard from '@/components/library/ResourceCard';
import { Sparkles } from 'lucide-react';

export default function RecommendationsTab({ initialQuery }) {
  const [recommendations, setRecommendations] = useState([]);
  const api = useApi({ context: 'recommendations' });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    const data = await api.execute(
      async () => {
        // In a real scenario, this would be a single, complex AI-driven endpoint.
        // For now, we simulate it by fetching a mix of recent content.
        const activities = await Activity.list('-created_date', 10);
        const resources = await LibraryResource.list('-created_date', 10);
        
        // Simple shuffle to mix content
        return [...activities, ...resources]
          .sort(() => 0.5 - Math.random())
          .slice(0, 15);
      },
      { key: 'recommendations', errorContext: 'loading recommendations' }
    );
    if (data) {
      setRecommendations(data);
    }
  };

  const renderCard = (item) => {
    if (item.materials_needed) { // Heuristic to detect Activity
      return <ActivityCard key={`activity-${item.id}`} activity={item} />;
    }
    if (item.content) { // Heuristic to detect LibraryResource
      return <ResourceCard key={`resource-${item.id}`} resource={item} />;
    }
    return null;
  };
  
  if (api.isLoading('recommendations')) {
    return <ListLoadingSkeleton items={6} cardType="mixed" />;
  }

  if (api.hasError('recommendations')) {
    return <ErrorState error={api.getError('recommendations')} onRetry={fetchRecommendations} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-purple-500" />
        Especially for You
      </h2>
      
      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map(renderCard)}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No recommendations yet"
          description="As you use Teachmo, we'll learn what you like and provide personalized suggestions here."
        />
      )}
    </div>
  );
}