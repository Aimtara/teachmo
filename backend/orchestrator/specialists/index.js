import hubMessageSend from './hubMessageSend.js';
import hubThreadSummarize from './hubThreadSummarize.js';
import weeklyBriefGenerate from './weeklyBriefGenerate.js';
import officeHoursBook from './officeHoursBook.js';
import homeworkHelp from './homeworkHelp.js';
import exploreDeepLink from './exploreDeepLink.js';
import safetyEscalate from './safetyEscalate.js';
import unknownClarify from './unknownClarify.js';

export const specialists = {
  HUB_MESSAGE_SEND: hubMessageSend,
  HUB_THREAD_SUMMARIZE: hubThreadSummarize,
  WEEKLY_BRIEF_GENERATE: weeklyBriefGenerate,
  OFFICE_HOURS_BOOK: officeHoursBook,
  HOMEWORK_HELP: homeworkHelp,
  EXPLORE_DEEP_LINK: exploreDeepLink,
  SAFETY_ESCALATE: safetyEscalate,
  UNKNOWN_CLARIFY: unknownClarify
};

export function getSpecialist(route) {
  return specialists[route] || specialists.UNKNOWN_CLARIFY;
}
