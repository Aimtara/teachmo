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
  list: (...args: unknown[]) => apiClient.entity.list(name, ...args),
  filter: (...args: unknown[]) => apiClient.entity.filter(name, ...args),
  get: (...args: unknown[]) => apiClient.entity.get(name, ...args),
  create: (...args: unknown[]) => apiClient.entity.create(name, ...args),
  update: (...args: unknown[]) => apiClient.entity.update(name, ...args),
  delete: (...args: unknown[]) => apiClient.entity.delete(name, ...args)
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
