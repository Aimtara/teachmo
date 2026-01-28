import request from 'supertest';
import express from 'express';
import accessControlsRouter from '../routes/accessControls.js';
import { injectUserContext } from '../middleware/authz.js';
import { families, students, partnerConsents } from '../models.js';

describe('Access Controls API', () => {
  const app = express();
  app.use(express.json());
  app.use(injectUserContext);
  app.use('/api/access', accessControlsRouter);

  let originalFamilies;
  let originalStudents;
  let originalPartnerConsents;

  beforeEach(() => {
    // Save original data
    originalFamilies = [...families];
    originalStudents = [...students];
    originalPartnerConsents = [...partnerConsents];
  });

  afterEach(() => {
    // Restore original data
    families.splice(0, families.length, ...originalFamilies);
    students.splice(0, students.length, ...originalStudents);
    partnerConsents.splice(0, partnerConsents.length, ...originalPartnerConsents);
  });

  describe('GET /families/:familyId', () => {
    test('allows a parent to view their own family data', async () => {
      const res = await request(app)
        .get('/api/access/families/family-1')
        .set('x-user-role', 'parent')
        .set('x-family-id', 'family-1')
        .set('x-user-id', 'parent-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('family-1');
      expect(res.body.students).toHaveLength(1);
      expect(res.body.students[0].id).toBe('student-1');
    });

    test('blocks a parent from viewing another family', async () => {
      const res = await request(app)
        .get('/api/access/families/family-2')
        .set('x-user-role', 'parent')
        .set('x-family-id', 'family-1')
        .set('x-user-id', 'parent-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('parents can only view their own family data');
    });

    test('blocks a teacher from viewing family data', async () => {
      const res = await request(app)
        .get('/api/access/families/family-1')
        .set('x-user-role', 'teacher')
        .set('x-class-ids', 'math-101')
        .set('x-user-id', 'teacher-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('blocks a partner from viewing family data', async () => {
      const res = await request(app)
        .get('/api/access/families/family-1')
        .set('x-user-role', 'partner')
        .set('x-partner-id', 'partner-analytics')
        .set('x-user-id', 'partner-user-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /classes/:classId/students', () => {
    test('allows a teacher to view students in their class', async () => {
      const res = await request(app)
        .get('/api/access/classes/math-101/students')
        .set('x-user-role', 'teacher')
        .set('x-class-ids', 'math-101,science-201')
        .set('x-user-id', 'teacher-1');

      expect(res.status).toBe(200);
      expect(res.body.classId).toBe('math-101');
      expect(res.body.students).toHaveLength(1);
      expect(res.body.students[0].classId).toBe('math-101');
    });

    test('blocks a teacher from viewing students in another class', async () => {
      const res = await request(app)
        .get('/api/access/classes/science-201/students')
        .set('x-user-role', 'teacher')
        .set('x-class-ids', 'math-101')
        .set('x-user-id', 'teacher-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('teachers can only access their own classes');
    });

    test('allows a parent to view students in classes tied to their children', async () => {
      const res = await request(app)
        .get('/api/access/classes/math-101/students')
        .set('x-user-role', 'parent')
        .set('x-family-id', 'family-1')
        .set('x-user-id', 'parent-1');

      expect(res.status).toBe(200);
      expect(res.body.classId).toBe('math-101');
      expect(res.body.students).toHaveLength(1);
    });

    test('blocks a parent from viewing students in unrelated classes', async () => {
      const res = await request(app)
        .get('/api/access/classes/science-201/students')
        .set('x-user-role', 'parent')
        .set('x-family-id', 'family-1')
        .set('x-user-id', 'parent-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('parents can only view classes tied to their children');
    });
  });

  describe('GET /partners/outcomes', () => {
    test('returns aggregated outcomes without detail when consent header is false', async () => {
      const res = await request(app)
        .get('/api/access/partners/outcomes')
        .set('x-user-role', 'partner')
        .set('x-partner-id', 'partner-analytics')
        .set('x-partner-consent', 'false')
        .set('x-user-id', 'partner-user-1');

      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('aggregated');
      expect(res.body.aggregated).toHaveProperty('totalStudents');
      expect(res.body.aggregated).toHaveProperty('averageProgress');
      expect(res.body).not.toHaveProperty('details');
    });

    test('returns aggregated and detailed outcomes when consent header is true', async () => {
      const res = await request(app)
        .get('/api/access/partners/outcomes')
        .set('x-user-role', 'partner')
        .set('x-partner-id', 'partner-analytics')
        .set('x-partner-consent', 'true')
        .set('x-user-id', 'partner-user-1');

      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('consented-detail');
      expect(res.body.aggregated).toHaveProperty('totalStudents');
      expect(res.body.aggregated).toHaveProperty('averageProgress');
      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details)).toBe(true);
      // Should only include students from consented families
      res.body.details.forEach((detail) => {
        expect(['family-1']).toContain(detail.familyId);
      });
    });

    test('returns zero values for empty student array', async () => {
      // Clear students array
      students.splice(0, students.length);

      const res = await request(app)
        .get('/api/access/partners/outcomes')
        .set('x-user-role', 'partner')
        .set('x-partner-id', 'partner-analytics')
        .set('x-partner-consent', 'false')
        .set('x-user-id', 'partner-user-1');

      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('aggregated');
      expect(res.body.aggregated.totalStudents).toBe(0);
      expect(res.body.aggregated.averageProgress).toBe(0);
    });

    test('blocks non-partners from accessing outcomes', async () => {
      const res = await request(app)
        .get('/api/access/partners/outcomes')
        .set('x-user-role', 'teacher')
        .set('x-class-ids', 'math-101')
        .set('x-user-id', 'teacher-1');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });
});
