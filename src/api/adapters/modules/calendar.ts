import type { CalendarEvent, Paginated } from '../types';
import * as base44Impl from './calendar.base44';
import * as graphqlImpl from './calendar.graphql';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_CALENDAR);

export async function list(params: Record<string, any> = {}): Promise<Paginated<CalendarEvent>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : base44Impl.list(params);
}

export async function getById(id: string): Promise<CalendarEvent | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : base44Impl.getById(id);
}
