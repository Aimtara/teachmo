import * as generatedEntities from './entities.generated';
import { WeeklyBrief } from './legacy/entities';

// Some adapters expect conversational "thread" entities that map to the Base44 Conversation schema.
// Provide aliases here so the rest of the app can depend on MessageThread + MessageThreadParticipant
// without failing to resolve during bundling.
const MessageThread = generatedEntities.Conversation;
const MessageThreadParticipant = generatedEntities.ConversationMember;

export const base44EntitiesMap = {
  ...generatedEntities,
  WeeklyBrief,
  MessageThread,
  MessageThreadParticipant
};

export default base44EntitiesMap;
export { MessageThread, MessageThreadParticipant };
export * from './entities.generated';
export { WeeklyBrief };
