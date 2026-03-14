import type { CalendarEvent, Paginated } from '../types';
import * as compatImpl from './calendar.compat';
import * as graphqlImpl from './calendar.graphql';

const USE_GRAPHQL = import.meta.env.VITE_USE_GRAPHQL_CALENDAR === 'true';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<CalendarEvent>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : compatImpl.list(params);
}

export async function getById(id: string): Promise<CalendarEvent | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : compatImpl.getById(id);
}
