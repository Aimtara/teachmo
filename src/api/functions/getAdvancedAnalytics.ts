export type AdvancedAnalyticsResponse<TParams> = {
  metrics: unknown[];
  params: TParams;
};

export async function getAdvancedAnalytics<TParams extends Record<string, unknown> = Record<string, unknown>>(
  params = {} as TParams
): Promise<AdvancedAnalyticsResponse<TParams>> {
  return { metrics: [], params };
}

export default getAdvancedAnalytics;
