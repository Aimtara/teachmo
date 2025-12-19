import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/shared/UltraMinimalToast';
import RecommendationCard from './RecommendationCard';

const fetchRecommendations = async (userId) => {
  if (!userId) return { items: [], unavailable: true };

  try {
    const response = await base44.functions.invoke('personalizedDiscoverFeed', { userId });
    const recommendations = response?.recommendations || response?.data || response || [];

    return {
      items: Array.isArray(recommendations) ? recommendations : [],
      unavailable: false
    };
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    const unavailable =
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('missing') ||
      message.includes('route not found');

    return { items: [], unavailable, error };
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
              We’ll surface personalized ideas once the recommendation function is live for your
              account.
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
