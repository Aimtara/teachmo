import { ROUTES } from './routes.js';
import exploreDeepLinkHandler from './handlers/exploreDeepLinkHandler.js';
import hubMessageSendHandler from './handlers/hubMessageSendHandler.js';
import weeklyBriefHandler from './handlers/weeklyBriefHandler.js';
import threadSummarizeHandler from './handlers/threadSummarizeHandler.js';
import officeHoursHandler from './handlers/officeHoursHandler.js';
import homeworkHelpHandler from './handlers/homeworkHelpHandler.js';
import safetyEscalateHandler from './handlers/safetyEscalateHandler.js';
import unknownClarifyHandler from './handlers/unknownClarifyHandler.js';

const HANDLERS = {
  [ROUTES.EXPLORE_DEEP_LINK]: exploreDeepLinkHandler,
  [ROUTES.HUB_MESSAGE_SEND]: hubMessageSendHandler,
  [ROUTES.WEEKLY_BRIEF_GENERATE]: weeklyBriefHandler,
  [ROUTES.HUB_THREAD_SUMMARIZE]: threadSummarizeHandler,
  [ROUTES.OFFICE_HOURS_BOOK]: officeHoursHandler,
  [ROUTES.HOMEWORK_HELP]: homeworkHelpHandler,
  [ROUTES.SAFETY_ESCALATE]: safetyEscalateHandler,
  [ROUTES.UNKNOWN_CLARIFY]: unknownClarifyHandler
};

export function getHandler(route) {
  return HANDLERS[route] || unknownClarifyHandler;
}
