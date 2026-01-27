import { buildContractResponse } from '../contract.js';

const exploreDeepLink = {
  requiredContext() {
    return ['schoolId'];
  },
  execute({ input }) {
    return {
      category: input.entities?.category || 'events',
      location: input.entities?.location || null
    };
  },
  formatResponse({ result }) {
    const params = new URLSearchParams();
    if (result?.category) params.set('tab', result.category);
    if (result?.location) params.set('near', result.location);
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
