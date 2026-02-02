/* eslint-env node */
import express from 'express';
import { createId, integrationStore, nowIso } from '../integrations/store.js';

const router = express.Router();

function findPlatform({ issuer, clientId, deploymentId }) {
  return integrationStore.ltiPlatforms.find(
    (platform) =>
      platform.issuer === issuer &&
      platform.clientId === clientId &&
      platform.deploymentId === deploymentId
  );
}

router.post('/platforms', (req, res) => {
  const { issuer, clientId, deploymentId, authTokenUrl, keysetUrl } = req.body || {};
  if (!issuer || !clientId || !deploymentId) {
    res.status(400).json({ error: 'issuer, clientId, and deploymentId are required' });
    return;
  }
  const platform = {
    id: createId('lti'),
    issuer,
    clientId,
    deploymentId,
    authTokenUrl: authTokenUrl || '',
    keysetUrl: keysetUrl || '',
    createdAt: nowIso(),
  };
  integrationStore.ltiPlatforms.push(platform);
  res.status(201).json(platform);
});

router.post('/login', (req, res) => {
  const { issuer, client_id: clientId, deployment_id: deploymentId, target_link_uri: targetLinkUri, login_hint: loginHint } = req.body || {};

  if (!issuer || !clientId || !deploymentId || !targetLinkUri) {
    res.status(400).json({ error: 'issuer, client_id, deployment_id, and target_link_uri are required' });
    return;
  }

  const platform = findPlatform({ issuer, clientId, deploymentId });
  if (!platform) {
    res.status(404).json({ error: 'LTI platform registration not found' });
    return;
  }

  const session = {
    id: createId('lti_session'),
    issuer,
    clientId,
    deploymentId,
    targetLinkUri,
    loginHint: loginHint || '',
    state: createId('state'),
    nonce: createId('nonce'),
    createdAt: nowIso(),
  };

  integrationStore.ltiSessions.push(session);
  res.json({ state: session.state, nonce: session.nonce, redirect: targetLinkUri });
});

router.post('/launch', (req, res) => {
  const { state, id_token: idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ error: 'id_token is required' });
    return;
  }

  const session = state ? integrationStore.ltiSessions.find((item) => item.state === state) : null;

  const requiredFields = ['iss', 'aud', 'nonce', 'deployment_id', 'message_type', 'sub'];
  const missing = requiredFields.filter((field) => !idToken[field]);
  if (missing.length) {
    res.status(400).json({ error: `Missing required id_token fields: ${missing.join(', ')}` });
    return;
  }

  if (session && idToken.nonce !== session.nonce) {
    res.status(400).json({ error: 'Invalid nonce' });
    return;
  }

  const platform = findPlatform({ issuer: idToken.iss, clientId: idToken.aud, deploymentId: idToken.deployment_id });
  if (!platform) {
    res.status(404).json({ error: 'LTI platform registration not found' });
    return;
  }

  const launch = {
    id: createId('launch'),
    state: state || null,
    issuer: idToken.iss,
    clientId: idToken.aud,
    deploymentId: idToken.deployment_id,
    messageType: idToken.message_type,
    userId: idToken.sub,
    context: idToken.context || {},
    createdAt: nowIso(),
  };

  integrationStore.ltiLaunches.push(launch);

  const roles = idToken['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
  const launchPresentation = idToken['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'] || {};
  const courseId = launch.context?.id || launch.context?.courseId || '';

  res.json({
    launchId: launch.id,
    messageType: launch.messageType,
    deepLinking: launch.messageType === 'LtiDeepLinkingRequest',
    context: launch.context,
    userId: launch.userId,
    courseId,
    roles,
    launchPresentationLocale: launchPresentation.locale || undefined,
  });
});

router.post('/deep-linking', (req, res) => {
  const { launchId, contentItems, returnUrl, items } = req.body || {};
  const resolvedItems = Array.isArray(contentItems) ? contentItems : items;
  if (!launchId || !Array.isArray(resolvedItems)) {
    res.status(400).json({ error: 'launchId and contentItems are required' });
    return;
  }

  const launch = integrationStore.ltiLaunches.find((item) => item.id === launchId);
  if (!launch) {
    res.status(404).json({ error: 'LTI launch not found' });
    return;
  }

  if (launch.messageType !== 'LtiDeepLinkingRequest') {
    res.status(400).json({ error: 'Launch is not a deep linking request' });
    return;
  }

  res.json({
    status: 'ready',
    returnUrl: returnUrl || launch.context?.deep_link_return_url || '',
    items: resolvedItems,
  });
});

export default router;
