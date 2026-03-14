import { createEntityBridge, createInvokeBridge } from './entityBridge';

export const messagingApi = {
  conversation: createEntityBridge('Conversation'),
  conversationMember: createEntityBridge('ConversationMember'),
  message: createEntityBridge('Message'),
  messageReaction: createEntityBridge('MessageReaction'),
  translation: createEntityBridge('Translation'),
  userConversation: createEntityBridge('UserConversation'),
  userMessage: createEntityBridge('UserMessage'),
  translateMessage: createInvokeBridge('translateMessage')
};
