import type { Activity, Paginated } from '../types';

import * as compatImpl from './activities.compat';
import * as graphqlImpl from './activities.graphql';

const USE_GRAPHQL = import.meta.env.VITE_USE_GRAPHQL_ACTIVITIES === 'true';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Activity>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : compatImpl.list(params);
}

export async function getById(id: string): Promise<Activity | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : compatImpl.getById(id);
}
