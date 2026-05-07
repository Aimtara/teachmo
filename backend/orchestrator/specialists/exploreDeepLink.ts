import { buildContractResponse } from '../contract.ts';
import type { Specialist } from './types.ts';
import { stringOrNull } from './types.ts';

const exploreDeepLink: Specialist = {
  requiredContext() {
    return ['schoolId'];
  },
  execute({ input }) {
    return {
      category: stringOrNull(input.entities?.category) || 'events',
      location: stringOrNull(input.entities?.location)
    };
  },
  formatResponse({ result }) {
    const params = new URLSearchParams();
    if (typeof result?.category === 'string') params.set('tab', result.category);
    if (typeof result?.location === 'string') params.set('near', result.location);
    const deepLink = `/discover?${params.toString()}`;

    return {
      response: buildContractResponse({
        summary: 'I can take you to Explore with filters already set.',
        nextStep: 'Open the Explore view.',
        detail: result
      }),
      ui: {
        type: 'DEEPLINK',
        title: 'Explore activities',
        primaryAction: { label: 'Open Explore', action: 'OPEN_EXPLORE' },
        deepLink
      }
    };
  }
};

export default exploreDeepLink;
