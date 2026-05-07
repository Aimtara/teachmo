import hubMessageSend from './hubMessageSend.ts';
import hubThreadSummarize from './hubThreadSummarize.ts';
import weeklyBriefGenerate from './weeklyBriefGenerate.ts';
import officeHoursBook from './officeHoursBook.ts';
import homeworkHelp from './homeworkHelp.ts';
import exploreDeepLink from './exploreDeepLink.ts';
import safetyEscalate from './safetyEscalate.ts';
import unknownClarify from './unknownClarify.ts';
import type { Specialist } from './types.ts';

export const specialists: Record<string, Specialist> = {
  HUB_MESSAGE_SEND: hubMessageSend,
  HUB_THREAD_SUMMARIZE: hubThreadSummarize,
  WEEKLY_BRIEF_GENERATE: weeklyBriefGenerate,
  OFFICE_HOURS_BOOK: officeHoursBook,
  HOMEWORK_HELP: homeworkHelp,
  EXPLORE_DEEP_LINK: exploreDeepLink,
  SAFETY_ESCALATE: safetyEscalate,
  UNKNOWN_CLARIFY: unknownClarify
};

export function getSpecialist(route: string): Specialist {
  return specialists[route] || specialists.UNKNOWN_CLARIFY;
}
