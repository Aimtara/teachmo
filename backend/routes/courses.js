/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireScopes(['partner:resources', 'partner:admin'], { any: true }), async (req, res) => {
  const { organizationId } = req.tenant;
  const coursesRes = await query(
    `select id, title, description, category, difficulty, created_at
     from partner_courses
     where organization_id = $1
     order by created_at desc`,
    [organizationId]
  );
  const courseIds = coursesRes.rows.map((c) => c.id);
  let modules = [];
  if (courseIds.length) {
    const modulesRes = await query(
      `select id, course_id, title, content, module_order
       from partner_course_modules
       where course_id = any($1)
       order by module_order asc`,
      [courseIds]
    );
    modules = modulesRes.rows;
  }
  const moduleMap = modules.reduce((acc, mod) => {
    const list = acc.get(mod.course_id) || [];
    list.push({
      id: mod.id,
      title: mod.title,
      content: mod.content,
      order: mod.module_order,
    });
    acc.set(mod.course_id, list);
    return acc;
  }, new Map());

  const payload = coursesRes.rows.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    difficulty: course.difficulty,
    modules: moduleMap.get(course.id) || [],
  }));
  res.json(payload);
});

router.post('/', requireAdmin, requireScopes('partner:admin'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { title, description, category, difficulty } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = await query(
    `insert into partner_courses (organization_id, title, description, category, difficulty)
     values ($1,$2,$3,$4,$5)
     returning id, title, description, category, difficulty`,
    [organizationId, title, description || null, category || null, difficulty || null]
  );
  res.status(201).json(r.rows?.[0]);
});

router.post('/:courseId/modules', requireAdmin, requireScopes('partner:admin'), async (req, res) => {
  const { courseId } = req.params;
  const { title, content, order } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = await query(
    `insert into partner_course_modules (course_id, title, content, module_order)
     values ($1,$2,$3,$4)
     returning id, course_id, title, content, module_order`,
    [courseId, title, content || null, order || 0]
  );
  res.status(201).json(r.rows?.[0]);
});

router.post('/:courseId/enroll', requireScopes('partner:resources'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { courseId } = req.params;
  const partnerId = req.auth?.userId || null;

  const existing = await query(
    `select id from partner_course_enrollments where course_id = $1 and partner_id = $2`,
    [courseId, partnerId]
  );
  if (existing.rows?.length) return res.status(400).json({ error: 'already enrolled' });

  const r = await query(
    `insert into partner_course_enrollments (organization_id, course_id, partner_id)
     values ($1,$2,$3)
     returning id, course_id, partner_id`,
    [organizationId, courseId, partnerId]
  );
  res.status(201).json(r.rows?.[0]);
});

router.get('/enrollments/me', requireScopes('partner:resources'), async (req, res) => {
  const { organizationId } = req.tenant;
  const partnerId = req.auth?.userId || null;
  const enrollmentsRes = await query(
    `select id, course_id from partner_course_enrollments where organization_id = $1 and partner_id = $2`,
    [organizationId, partnerId]
  );
  const enrollmentIds = enrollmentsRes.rows.map((e) => e.id);
  let completions = [];
  if (enrollmentIds.length) {
    const completionRes = await query(
      `select enrollment_id, module_id from partner_course_module_completions where enrollment_id = any($1)`,
      [enrollmentIds]
    );
    completions = completionRes.rows;
  }
  const completionMap = completions.reduce((acc, row) => {
    const list = acc.get(row.enrollment_id) || [];
    list.push(row.module_id);
    acc.set(row.enrollment_id, list);
    return acc;
  }, new Map());

  const payload = enrollmentsRes.rows.map((enrollment) => ({
    id: enrollment.id,
    courseId: enrollment.course_id,
    completedModules: completionMap.get(enrollment.id) || [],
  }));
  res.json(payload);
});

router.post('/:courseId/modules/:moduleId/complete', requireScopes('partner:resources'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { courseId, moduleId } = req.params;
  const partnerId = req.auth?.userId || null;
  const enrollmentRes = await query(
    `select id from partner_course_enrollments
     where organization_id = $1 and course_id = $2 and partner_id = $3`,
    [organizationId, courseId, partnerId]
  );
  if (!enrollmentRes.rows?.length) return res.status(404).json({ error: 'enrollment not found' });
  const enrollmentId = enrollmentRes.rows[0].id;

  await query(
    `insert into partner_course_module_completions (enrollment_id, module_id)
     values ($1,$2)
     on conflict (enrollment_id, module_id) do nothing`,
    [enrollmentId, moduleId]
  );

  const completionRes = await query(
    `select module_id from partner_course_module_completions where enrollment_id = $1`,
    [enrollmentId]
  );
  res.json({
    id: enrollmentId,
    courseId,
    completedModules: completionRes.rows.map((row) => row.module_id)
  });
});

export default router;
