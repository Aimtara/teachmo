import { apiClient } from '@/services/core/client';

type AnyRecord = Record<string, unknown>;

type EntityBridge = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
  get?: (...args: unknown[]) => Promise<unknown>;
  create?: (...args: unknown[]) => Promise<unknown>;
  update?: (...args: unknown[]) => Promise<unknown>;
  delete?: (...args: unknown[]) => Promise<unknown>;
};

const entity = (name: string): EntityBridge => ({
  list: (params?: Record<string, unknown>) => apiClient.entity.list(name, params),
  filter: (params?: Record<string, unknown>) => apiClient.entity.filter(name, params),
  get: (id: string) => apiClient.entity.get(name, id),
  create: (payload: Record<string, unknown>) => apiClient.entity.create(name, payload),
  update: (id: string, payload: Record<string, unknown>) => apiClient.entity.update(name, id, payload),
  delete: (id: string) => apiClient.entity.delete(name, id)
});

const invoke = (name: string) => (payload?: AnyRecord) => apiClient.functions.invoke(name, payload);

export const messagingApi = {
  conversation: entity('Conversation'),
  conversationMember: entity('ConversationMember'),
  message: entity('Message'),
  messageReaction: entity('MessageReaction'),
  translation: entity('Translation'),
  userConversation: entity('UserConversation'),
  userMessage: entity('UserMessage'),
  translateMessage: invoke('translateMessage')
};
