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
      .send({
        name: 'Strict mapping',
        roleMappings: { teacher: 'teacher' },
        defaultRole: null,
        allowedRoles: ['teacher'],
      });

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

describe('Integration SIS and Google Classroom endpoints', () => {
  test('validates SIS config and returns sync job status', async () => {
    const testRes = await request(app)
      .post('/api/integrations/sis/test')
      .send({
        schoolId: 'school-1',
        type: 'oneroster',
        baseUrl: 'https://district.example/oneroster',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

    expect(testRes.status).toBe(200);
    expect(testRes.body.success).toBe(true);

    const syncRes = await request(app)
      .post('/api/integrations/sis/school-1/sync')
      .send({
        rosterType: 'full',
        source: 'oneroster',
      });
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.status).toBe('pending');

    const statusRes = await request(app).get(`/api/integrations/sis/jobs/${syncRes.body.jobId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('pending');
    expect(statusRes.body.summary).toBeNull();
  });


  test('imports SIS roster payload and returns summary', async () => {
    const syncRes = await request(app)
      .post('/api/integrations/sis/11111111-1111-4111-8111-111111111111/sync')
      .send({
        organizationId: '22222222-2222-4222-8222-222222222222',
        rosterType: 'full',
        source: 'oneroster',
        roster: {
          students: [{ externalId: 's-1', firstName: 'Sam', lastName: 'Student', grade: '4' }],
          teachers: [{ externalId: 't-1', firstName: 'Tia', lastName: 'Teacher', email: 't@school.org' }],
          classes: [{ externalId: 'c-1', name: 'Math', teacherExternalId: 't-1' }],
          enrollments: [{ classExternalId: 'c-1', studentExternalId: 's-1' }],
        },
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.status).toBe('completed');
    expect(syncRes.body.summary).toEqual({ students: 1, teachers: 1, classes: 1, enrollments: 1 });

    const jobRes = await request(app).get(`/api/integrations/sis/jobs/${syncRes.body.jobId}`);
    expect(jobRes.status).toBe(200);
    expect(jobRes.body.summary).toEqual({ students: 1, teachers: 1, classes: 1, enrollments: 1 });
  });

  test('rate limits Google Classroom syncs', async () => {
    const firstRes = await request(app)
      .post('/api/integrations/google/sync/courses')
      .send({ teacherId: 'teacher-1', fullSync: true });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.fullSync).toBe(true);

    const secondRes = await request(app)
      .post('/api/integrations/google/sync/courses')
      .send({ teacherId: 'teacher-1', fullSync: false });

    expect(secondRes.status).toBe(429);
    expect(secondRes.body.error).toMatch(/Rate limit exceeded/i);
  });
});
