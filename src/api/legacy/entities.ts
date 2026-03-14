import * as generatedEntities from './entities.generated.js';
import { WeeklyBrief } from './entities.bridge';

const MessageThread = generatedEntities.Conversation;
const MessageThreadParticipant = generatedEntities.ConversationMember;

export const entitiesMap = {
  ...generatedEntities,
  WeeklyBrief,
  MessageThread,
  MessageThreadParticipant
};

export default entitiesMap;
export { MessageThread, MessageThreadParticipant };
export * from './entities.generated.js';
export { WeeklyBrief };
