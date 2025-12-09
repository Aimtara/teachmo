import { base44Entities, base44Functions } from '@/api/base44';

const {
  Conversation,
  ConversationMember,
  Message,
  MessageReaction,
  Translation,
  UserConversation,
  UserMessage
} = base44Entities;

const { translateMessage } = base44Functions;

export const messagingApi = {
  conversation: Conversation,
  conversationMember: ConversationMember,
  message: Message,
  messageReaction: MessageReaction,
  translation: Translation,
  userConversation: UserConversation,
  userMessage: UserMessage,
  translateMessage
};
