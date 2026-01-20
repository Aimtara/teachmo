export const ROUTES = {
  HUB_MESSAGE_SEND: 'HUB_MESSAGE_SEND',
  HUB_THREAD_SUMMARIZE: 'HUB_THREAD_SUMMARIZE',
  WEEKLY_BRIEF_GENERATE: 'WEEKLY_BRIEF_GENERATE',
  OFFICE_HOURS_BOOK: 'OFFICE_HOURS_BOOK',
  HOMEWORK_HELP: 'HOMEWORK_HELP',
  EXPLORE_DEEP_LINK: 'EXPLORE_DEEP_LINK',
  SAFETY_ESCALATE: 'SAFETY_ESCALATE',
  UNKNOWN_CLARIFY: 'UNKNOWN_CLARIFY'
};

export const ROUTE_CONFIG = {
  [ROUTES.HUB_MESSAGE_SEND]: {
    requiredContext: ['childId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  },
  [ROUTES.HUB_THREAD_SUMMARIZE]: {
    requiredContext: [],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  },
  [ROUTES.WEEKLY_BRIEF_GENERATE]: {
    requiredContext: ['childId'],
    allowedRoles: ['PARENT', 'ADMIN']
  },
  [ROUTES.OFFICE_HOURS_BOOK]: {
    requiredContext: ['childId', 'schoolId'],
    allowedRoles: ['PARENT', 'ADMIN']
  },
  [ROUTES.HOMEWORK_HELP]: {
    requiredContext: ['childId'],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  },
  [ROUTES.EXPLORE_DEEP_LINK]: {
    requiredContext: ['schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  },
  [ROUTES.SAFETY_ESCALATE]: {
    requiredContext: [],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  },
  [ROUTES.UNKNOWN_CLARIFY]: {
    requiredContext: [],
    allowedRoles: ['PARENT', 'TEACHER', 'ADMIN']
  }
};
