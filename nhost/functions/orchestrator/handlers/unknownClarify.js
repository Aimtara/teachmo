import { ROUTES } from '../routes.js';

export async function unknownClarifyHandler() {
  return {
    route: ROUTES.UNKNOWN_CLARIFY,
    ui: {
      type: 'CHOICE',
      title: 'What would you like to do?',
      options: [
        {
          label: 'Send a message',
          value: ROUTES.HUB_MESSAGE_SEND,
          description: 'Draft a note to a teacher or staff member'
        },
        {
          label: 'Summarize messages',
          value: ROUTES.HUB_THREAD_SUMMARIZE,
          description: 'Catch me up on a thread'
        },
        {
          label: 'Weekly brief',
          value: ROUTES.WEEKLY_BRIEF_GENERATE,
          description: 'What did I miss this week?'
        },
        {
          label: 'Explore resources',
          value: ROUTES.EXPLORE_DEEP_LINK,
          description: 'Find events, activities, or programs'
        }
      ]
    }
  };
}
