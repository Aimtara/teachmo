import {
  Conversation,
  ConversationMember,
  Message,
  MessageReaction,
  Translation,
  UserConversation,
  UserMessage
} from '@/API/entities';
import { translateMessage } from '@/API/functions';

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
