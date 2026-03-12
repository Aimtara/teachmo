import { base44Entities, base44Functions } from '@/api/base44';

type AnyRecord = Record<string, unknown>;

const entities = base44Entities as AnyRecord;
const functions = base44Functions as AnyRecord;

export const messagingApi = {
  conversation: entities.Conversation,
  conversationMember: entities.ConversationMember,
  message: entities.Message,
  messageReaction: entities.MessageReaction,
  translation: entities.Translation,
  userConversation: entities.UserConversation,
  userMessage: entities.UserMessage,
  translateMessage: functions.translateMessage
};
