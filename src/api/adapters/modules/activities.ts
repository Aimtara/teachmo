import type { Activity, Paginated } from '../types';

import * as base44Impl from './activities.base44';
import * as graphqlImpl from './activities.graphql';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_ACTIVITIES);

export async function list(params: Record<string, any> = {}): Promise<Paginated<Activity>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : base44Impl.list(params);
}

export async function getById(id: string): Promise<Activity | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : base44Impl.getById(id);
}
