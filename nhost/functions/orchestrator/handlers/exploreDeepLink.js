import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

function buildExploreLink(text = '') {
  const q = encodeURIComponent(String(text || '').slice(0, 200));
  // Keep this aligned with your router paths. If you change Explore routes,
  // only this function should need updating.
  return `/discover?query=${q}`;
}

export async function exploreDeepLinkHandler(ctx) {
  const deepLink = buildExploreLink(ctx.text || '');

  return {
    route: ROUTES.EXPLORE_DEEP_LINK,
    ui: {
      type: 'DEEPLINK',
      title: 'Explore results',
      deepLink
    },
    artifact: {
      type: ARTIFACT_TYPES.DEEPLINK,
      payload: { deepLink, query: ctx.text || '' },
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    }
  };
}
