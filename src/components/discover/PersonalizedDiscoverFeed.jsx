import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/shared/UltraMinimalToast';
import { graphqlRequest } from '@/lib/graphql';
import RecommendationCard from './RecommendationCard';

const RECOMMENDATION_QUERY = `query DiscoverRecommendations($limit: Int) {
  activities(order_by: { created_at: desc }, limit: $limit) {
    id
    title
    description
    subject
    grade_level
    category
    library_items(limit: 1) {
      id
      url
      format
    }
  }
}`;

const buildRecommendation = (activity) => {
  const libraryItem = activity?.library_items?.[0] ?? null;
  const tags = [activity?.category, libraryItem?.format].filter(Boolean);

  return {
    id: activity?.id,
    title: activity?.title,
    summary: activity?.description,
    subject: activity?.subject,
    gradeLevel: activity?.grade_level,
    tags,
    ctaLabel: libraryItem?.url ? 'Open resource' : 'View details',
    ctaHref: libraryItem?.url ?? undefined
  };
};

const fetchRecommendations = async (userId) => {
  if (!userId) return { items: [], unavailable: true };

  try {
    const data = await graphqlRequest({
      query: RECOMMENDATION_QUERY,
      variables: { limit: 6 }
    });
    const activities = data?.activities ?? [];

    return {
      items: activities.map(buildRecommendation),
      unavailable: false
    };
  } catch (error) {
    return { items: [], unavailable: false, error };
  }
};

export default function PersonalizedDiscoverFeed() {
  const user = useUserData();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['personalized-discover-feed', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchRecommendations(user?.id),
    staleTime: 1000 * 60 * 5
  });

  const items = useMemo(() => data?.items || [], [data]);
  const unavailable = data?.unavailable;

  const handleGenerate = async () => {
    const result = await refetch();
    if (result?.error && !result?.data?.unavailable) {
      showToast('Unable to generate recommendations', {
        description: result.error.message || 'Please try again shortly.'
      });
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Personalized for you</h2>
          <p className="text-sm text-gray-600">
            Recommendations generated from your saved interests and classroom activity.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={handleGenerate}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing' : 'Generate Recommendations'}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="h-4 w-1/3 rounded bg-gray-100" />
            <div className="h-3 w-3/4 rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Sparkles className="h-4 w-4" />
              No Recommendations Yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              We’ll surface personalized ideas as soon as your activity and library data are
              available.
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleGenerate}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Checking again...' : 'Generate Recommendations'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((recommendation, index) => (
          <RecommendationCard key={recommendation?.id || recommendation?.title || index} recommendation={recommendation} />
        ))}
      </div>

      {data?.error && unavailable ? (
        <p className="text-sm text-amber-600">
          Recommendation service is not available yet. We’ll enable it as soon as it ships.
        </p>
      ) : null}
    </div>
  );
}
