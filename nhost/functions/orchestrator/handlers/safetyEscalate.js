import { ROUTES } from '../routes.js';

export async function safetyEscalateHandler() {
  return {
    route: ROUTES.SAFETY_ESCALATE,
    ui: {
      type: 'CARD',
      title: 'Safety check',
      body:
        'This sounds like it could involve safety. If someone is in immediate danger, call local emergency services.\n\nFor school-related concerns (bullying, threats, harassment), you can also open a report and route it to the right staff.',
      deepLink: '/safety',
      primaryAction: { label: 'Open Safety tools', action: 'OPEN_SAFETY' }
    }
  };
}
