import request from 'supertest';
import express from 'express';
import ltiRouter from '../routes/lti.js';
import { resetIntegrationStore } from '../integrations/store.js';

const app = express();
app.use(express.json());
app.use('/api/lti', ltiRouter);

beforeEach(() => {
  resetIntegrationStore();
});

describe('LTI flows', () => {
  test('handles login, launch, and deep linking', async () => {
    const platformRes = await request(app)
      .post('/api/lti/platforms')
      .send({ issuer: 'https://lms.example', clientId: 'client-123', deploymentId: 'dep-1' });

    expect(platformRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/lti/login')
      .send({
        issuer: 'https://lms.example',
        client_id: 'client-123',
        deployment_id: 'dep-1',
        target_link_uri: 'https://teachmo.example/launch',
        login_hint: 'user-1',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('state');
    expect(loginRes.body).toHaveProperty('nonce');

    const launchRes = await request(app)
      .post('/api/lti/launch')
      .send({
        state: loginRes.body.state,
        id_token: {
          iss: 'https://lms.example',
          aud: 'client-123',
          nonce: loginRes.body.nonce,
          deployment_id: 'dep-1',
          message_type: 'LtiDeepLinkingRequest',
          sub: 'user-1',
          context: { deep_link_return_url: 'https://lms.example/return' },
        },
      });

    expect(launchRes.status).toBe(200);
    expect(launchRes.body.deepLinking).toBe(true);

    const deepLinkRes = await request(app)
      .post('/api/lti/deep-linking')
      .send({
        launchId: launchRes.body.launchId,
        contentItems: [{ type: 'ltiResourceLink', url: 'https://teachmo.example/activity/1' }],
        returnUrl: 'https://lms.example/return',
      });

    expect(deepLinkRes.status).toBe(200);
    expect(deepLinkRes.body.status).toBe('ready');
  });
});
