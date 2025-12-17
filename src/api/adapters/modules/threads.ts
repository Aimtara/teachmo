import * as base44Impl from './threads.base44';
import * as graphqlImpl from './threads.graphql';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_MESSAGES);

export async function createThread(input: {
  title: string;
  creatorId: string;
  participantIds: string[];
  initialMessage?: string;
}) {
  return USE_GRAPHQL ? graphqlImpl.createThread(input) : base44Impl.createThread(input);
}
