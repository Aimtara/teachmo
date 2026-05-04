import { graphqlRequest } from '@/lib/graphql';

export type DiscoverActivity = {
  id?: string;
  title?: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  category?: string;
  library_items?: Array<{
    id?: string;
    url?: string;
    format?: string;
  }>;
};

export type DiscoverRecommendation = {
  id?: string;
  title?: string;
  summary?: string;
  subject?: string;
  gradeLevel?: string;
  tags: string[];
  ctaLabel: string;
  ctaHref?: string;
};

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

export function buildDiscoverRecommendation(activity: DiscoverActivity): DiscoverRecommendation {
  const libraryItem = activity?.library_items?.[0] ?? null;
  const tags = [activity?.category, libraryItem?.format].filter(Boolean) as string[];

  return {
    id: activity?.id,
    title: activity?.title,
    summary: activity?.description,
    subject: activity?.subject,
    gradeLevel: activity?.grade_level,
    tags,
    ctaLabel: libraryItem?.url ? 'Open resource' : 'View details',
    ctaHref: libraryItem?.url ?? undefined,
  };
}

export async function listDiscoverRecommendations(limit = 6): Promise<DiscoverRecommendation[]> {
  const data = await graphqlRequest<{ activities?: DiscoverActivity[] }>({
    query: RECOMMENDATION_QUERY,
    variables: { limit },
  });
  const activities = data?.activities ?? [];
  return activities.map(buildDiscoverRecommendation);
}
