/* eslint-env node */
import { Router } from 'express';
import {
  partnerSubmissions,
  incentiveApplications,
  partnerContracts,
  onboardingTasks,
  trainingCourses,
  trainingModules,
  partnerSubmissionAudits,
  nextId,
} from '../models.js';

const router = Router();

const logAudit = (entry) => {
  partnerSubmissionAudits.push({ id: nextId('audit'), timestamp: new Date().toISOString(), ...entry });
};

router.get('/audits', (req, res) => {
  res.json(partnerSubmissionAudits);
});

// approve/reject submission
router.patch('/submissions/:id', (req, res) => {
  const { id } = req.params;
  const { status, adminId, reason } = req.body;
  const submission = partnerSubmissions.find((s) => s.id === Number(id));
  if (!submission) return res.status(404).json({ error: 'not found' });
  submission.status = status;
  if (reason) submission.reason = reason;
  logAudit({ entity: 'submission', entityId: submission.id, action: status, adminId });
  res.json(submission);
});

// approve/reject incentive application
router.patch('/incentive-applications/:id', (req, res) => {
  const { id } = req.params;
  const { status, adminId, payout } = req.body;
  const application = incentiveApplications.find((a) => a.id === Number(id));
  if (!application) return res.status(404).json({ error: 'not found' });
  application.status = status;
  if (payout) application.payout = payout;
  logAudit({ entity: 'incentiveApplication', entityId: application.id, action: status, adminId });
  res.json(application);
});

// approve/reject contract
router.patch('/contracts/:id', (req, res) => {
  const { id } = req.params;
  const { status, adminId } = req.body;
  const contract = partnerContracts.find((c) => c.id === Number(id));
  if (!contract) return res.status(404).json({ error: 'not found' });
  contract.status = status;
  logAudit({ entity: 'contract', entityId: contract.id, action: status, adminId });
  res.json(contract);
});

// create onboarding task
router.post('/onboarding-tasks', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const task = { id: nextId('task'), name, description: description || '' };
  onboardingTasks.push(task);
  logAudit({ entity: 'onboardingTask', entityId: task.id, action: 'create' });
  res.status(201).json(task);
});

// create course with modules
router.post('/courses', (req, res) => {
  const { title, description, modules } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const course = { id: nextId('course'), title, description: description || '' };
  trainingCourses.push(course);
  if (Array.isArray(modules)) {
    modules.forEach((m, idx) => {
      trainingModules.push({
        id: nextId('module'),
        courseId: course.id,
        title: m.title,
        content: m.content || '',
        order: idx,
      });
    });
  }
  logAudit({ entity: 'course', entityId: course.id, action: 'create' });
  res.status(201).json({ course });
});

export default router;
