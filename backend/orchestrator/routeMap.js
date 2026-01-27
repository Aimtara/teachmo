export const ROUTES = {
  HUB_MESSAGE_SEND: {
    key: 'HUB_MESSAGE_SEND',
    label: 'Hub message send',
    requiredContext: ['childId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['messaging', 'translation'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/hub/messages'
    }
  },
  HUB_THREAD_SUMMARIZE: {
    key: 'HUB_THREAD_SUMMARIZE',
    label: 'Hub thread summarize',
    requiredContext: ['threadId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['messaging', 'summarization'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/hub/messages'
    }
  },
  WEEKLY_BRIEF_GENERATE: {
    key: 'WEEKLY_BRIEF_GENERATE',
    label: 'Weekly brief generate',
    requiredContext: ['childId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['digest', 'content'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/hub/briefs'
    }
  },
  OFFICE_HOURS_BOOK: {
    key: 'OFFICE_HOURS_BOOK',
    label: 'Office hours booking',
    requiredContext: ['childId', 'teacherId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['calendar', 'notifications'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/office-hours'
    }
  },
  HOMEWORK_HELP: {
    key: 'HOMEWORK_HELP',
    label: 'Homework help',
    requiredContext: ['childId', 'schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['assignments', 'content'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/homework'
    }
  },
  EXPLORE_DEEP_LINK: {
    key: 'EXPLORE_DEEP_LINK',
    label: 'Explore deep link',
    requiredContext: ['schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['search'],
    uiHandoff: {
      type: 'DEEPLINK',
      deepLink: '/discover'
    }
  },
  SAFETY_ESCALATE: {
    key: 'SAFETY_ESCALATE',
    label: 'Safety escalation',
    requiredContext: ['schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: ['safety', 'notifications'],
    uiHandoff: {
      type: 'CARD',
      deepLink: '/safety'
    }
  },
  UNKNOWN_CLARIFY: {
    key: 'UNKNOWN_CLARIFY',
    label: 'Unknown clarify',
    requiredContext: ['schoolId'],
    allowedRoles: ['PARENT', 'TEACHER', 'STAFF'],
    tools: [],
    uiHandoff: {
      type: 'FOLLOWUP_QUESTION',
      deepLink: '/assistant'
    }
  }
};

export const ROUTE_KEYS = Object.keys(ROUTES);

export function getRouteConfig(route) {
  return ROUTES[route] || ROUTES.UNKNOWN_CLARIFY;
}
