import request from 'supertest';
import express from 'express';
import integrationsRouter from '../routes/integrations.js';
import { resetIntegrationStore } from '../integrations/store.js';

const app = express();
app.use(express.json());
app.use('/api/integrations', integrationsRouter);

beforeEach(() => {
  resetIntegrationStore();
});

describe('Integration roster sync', () => {
  test('maps roles and deprovisions missing users', async () => {
    const ruleRes = await request(app)
      .post('/api/integrations/iam/rules')
      .send({
        name: 'District mapping',
        roleMappings: { teacher: 'teacher', student: 'student' },
        defaultRole: 'parent',
        deprovisionMissing: true,
      });

    const ruleId = ruleRes.body.id;

    const sourceRes = await request(app)
      .post('/api/integrations/roster/sources')
      .send({ name: 'OneRoster feed', iamRuleId: ruleId, scheduleCron: '*/30 * * * *' });

    const sourceId = sourceRes.body.id;

    const syncRes = await request(app)
      .post(`/api/integrations/roster/sources/${sourceId}/sync`)
      .send({
        records: [
          { externalId: 'u1', email: 'teacher@school.org', fullName: 'Teacher One', role: 'teacher' },
          { externalId: 'u2', email: 'student@school.org', fullName: 'Student One', role: 'student' },
        ],
        options: { deactivateMissing: true },
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.stats.upserted).toBe(2);
    expect(syncRes.body.stats.deactivated).toBe(0);

    const usersRes = await request(app).get(`/api/integrations/roster/users?sourceId=${sourceId}`);
    expect(usersRes.body).toHaveLength(2);
    expect(usersRes.body[0]).toHaveProperty('mappedRole');

    const secondSync = await request(app)
      .post(`/api/integrations/roster/sources/${sourceId}/sync`)
      .send({
        records: [
          { externalId: 'u1', email: 'teacher@school.org', fullName: 'Teacher One', role: 'teacher' },
        ],
        options: { deactivateMissing: true },
      });

    expect(secondSync.body.stats.deactivated).toBe(1);

    const usersAfter = await request(app).get(`/api/integrations/roster/users?sourceId=${sourceId}`);
    const deactivated = usersAfter.body.find((user) => user.externalId === 'u2');
    expect(deactivated.active).toBe(false);
  });

  test('reports unmapped roles in diagnostics', async () => {
    const ruleRes = await request(app)
      .post('/api/integrations/iam/rules')
      .send({ name: 'Strict mapping', roleMappings: { teacher: 'teacher' }, defaultRole: null });

    const sourceRes = await request(app)
      .post('/api/integrations/roster/sources')
      .send({ name: 'Strict source', iamRuleId: ruleRes.body.id });

    const syncRes = await request(app)
      .post(`/api/integrations/roster/sources/${sourceRes.body.id}/sync`)
      .send({
        records: [
          { externalId: 'u1', email: 'staff@school.org', fullName: 'Staff One', role: 'staff' },
        ],
      });

    expect(syncRes.body.stats.invalid).toBe(1);
    expect(syncRes.body.diagnostics.missingRoleMappings).toHaveLength(1);
  });
});
