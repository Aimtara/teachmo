import { ROUTES } from './routes.js';
import { exploreDeepLinkHandler } from './handlers/exploreDeepLink.js';
import { hubMessageSendHandler } from './handlers/hubMessageSend.js';
import { safetyEscalateHandler } from './handlers/safetyEscalate.js';
import { unknownClarifyHandler } from './handlers/unknownClarify.js';
import { threadSummarizeHandler } from './handlers/threadSummarize.js';
import { weeklyBriefHandler } from './handlers/weeklyBrief.js';
import { officeHoursHandler } from './handlers/officeHours.js';
import { homeworkHelpHandler } from './handlers/homeworkHelp.js';

export const HANDLERS = {
  [ROUTES.EXPLORE_DEEP_LINK]: exploreDeepLinkHandler,
  [ROUTES.HUB_MESSAGE_SEND]: hubMessageSendHandler,
  [ROUTES.SAFETY_ESCALATE]: safetyEscalateHandler,
  [ROUTES.UNKNOWN_CLARIFY]: unknownClarifyHandler,
  [ROUTES.HUB_THREAD_SUMMARIZE]: threadSummarizeHandler,
  [ROUTES.WEEKLY_BRIEF_GENERATE]: weeklyBriefHandler,
  [ROUTES.OFFICE_HOURS_BOOK]: officeHoursHandler,
  [ROUTES.HOMEWORK_HELP]: homeworkHelpHandler
};

export function getHandler(route) {
  return HANDLERS[route] || unknownClarifyHandler;
}
