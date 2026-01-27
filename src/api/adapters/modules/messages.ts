import type { Message, MessageThread, Paginated } from '../types';
import * as base44Impl from './messages.base44';
import * as graphqlImpl from './messages.graphql';

const USE_GRAPHQL = Boolean(import.meta.env.VITE_USE_GRAPHQL_MESSAGES);

export async function listThreads(params: Record<string, unknown> = {}): Promise<Paginated<MessageThread>> {
  return USE_GRAPHQL ? graphqlImpl.listThreads(params) : base44Impl.listThreads(params);
}

export async function listMessages(threadId: string, params: Record<string, unknown> = {}): Promise<Paginated<Message>> {
  return USE_GRAPHQL ? graphqlImpl.listMessages(threadId, params) : base44Impl.listMessages(threadId, params);
}

export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
}): Promise<Message | null | undefined> {
  return USE_GRAPHQL ? graphqlImpl.sendMessage(input) : base44Impl.sendMessage(input);
}

export async function hideMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  return USE_GRAPHQL ? graphqlImpl.hideMessage(input) : base44Impl.hideMessage(input);
}

export async function redactMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  return USE_GRAPHQL ? graphqlImpl.redactMessage(input) : base44Impl.redactMessage(input);
}

export async function deleteMessage(input: { messageId: string; moderatorId: string; reason?: string }) {
  return USE_GRAPHQL ? graphqlImpl.deleteMessage(input) : base44Impl.deleteMessage(input);
}
