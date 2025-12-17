import type { Event, ListEventsParams, Paginated } from "../types";
import * as base44Impl from "./events.base44";
import * as graphqlImpl from "./events.graphql";

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_EVENTS);

export async function list(params: ListEventsParams = {}): Promise<Paginated<Event>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : base44Impl.list(params);
}

export async function getById(id: string): Promise<Event | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : base44Impl.getById(id);
}
