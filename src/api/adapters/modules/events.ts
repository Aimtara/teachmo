import type { Event, Paginated } from "../types";
import * as compatImpl from "./events.compat";
import * as graphqlImpl from "./events.graphql";

const USE_GRAPHQL = import.meta.env.VITE_USE_GRAPHQL_EVENTS === "true";

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Event>> {
  return USE_GRAPHQL ? graphqlImpl.list(params) : compatImpl.list(params);
}

export async function getById(id: string): Promise<Event | null> {
  return USE_GRAPHQL ? graphqlImpl.getById(id) : compatImpl.getById(id);
}
