/* eslint-env node */

function echoResult(kind, input = {}, extra = {}) {
  return {
    kind,
    status: 'accepted',
    draftOnly: true,
    ...extra,
    input,
  };
}

const registry = {
  explore_routing: {
    id: 'explore_routing',
    description: 'Routes discovery requests into the explore surface.',
    allowedActions: ['EXPLORE_DEEP_LINK', 'find_activities', 'browse_all', 'library'],
    async execute({ input }) {
      return echoResult('explore_routing', input, {
        route: '/explore',
      });
    },
  },
  parent_coach: {
    id: 'parent_coach',
    description: 'Handles parent/coach assistance in a governed way.',
    allowedActions: ['HOMEWORK_HELP', 'WEEKLY_BRIEF_GENERATE', 'OFFICE_HOURS_BOOK', 'COACH'],
    async execute({ input }) {
      return echoResult('parent_coach', input, {
        advisoryOnly: true,
      });
    },
  },
  partner_submission: {
    id: 'partner_submission',
    description: 'Queues partner submissions for review.',
    allowedActions: ['submit_event', 'submit_resource', 'submit_offer'],
    async execute({ input, actor }) {
      return echoResult('partner_submission', input, {
        queuedForReview: true,
        submittedBy: actor?.userId ?? null,
      });
    },
  },
  school_request: {
    id: 'school_request',
    description: 'Queues school participation or school-scope requests.',
    allowedActions: ['school_request', 'school_participation'],
    async execute({ input, actor }) {
      return echoResult('school_request', input, {
        queuedForReview: true,
        submittedBy: actor?.userId ?? null,
      });
    },
  },
  consent_and_child_data: {
    id: 'consent_and_child_data',
    description: 'Explains consent/guardian requirements for child-data access.',
    allowedActions: ['child_data_access'],
    async execute({ input }) {
      return {
        kind: 'consent_and_child_data',
        status: 'blocked',
        draftOnly: true,
        message: 'Guardian verification and child-data consent are required before continuing.',
        input,
      };
    },
  },
  safety_escalation: {
    id: 'safety_escalation',
    description: 'Escalates sensitive safety cases.',
    allowedActions: ['safety_escalation'],
    async execute({ input, actor }) {
      return {
        kind: 'safety_escalation',
        status: 'escalated',
        draftOnly: true,
        escalate: true,
        submittedBy: actor?.userId ?? null,
        input,
      };
    },
  },
};

export function getGovernedSkill(skillId) {
  return registry[skillId] ?? null;
}

export function listGovernedSkills() {
  return Object.values(registry).map(({ execute, ...meta }) => meta);
}
