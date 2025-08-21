/* eslint-env node */
import { Router } from 'express';
import { onboardingTasks, partnerTaskProgress, nextId } from '../models.js';

const router = Router();

router.get('/tasks', (req, res) => {
  res.json(onboardingTasks);
});

router.post('/tasks', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const task = { id: nextId('task'), name, description: description || '' };
  onboardingTasks.push(task);
  res.status(201).json(task);
});

router.get('/progress/:partnerId', (req, res) => {
  const { partnerId } = req.params;
  const tasks = onboardingTasks.map((t) => {
    const progress = partnerTaskProgress.find((p) => p.partnerId === partnerId && p.taskId === t.id);
    return { ...t, completed: progress ? progress.completed : false };
  });
  res.json(tasks);
});

router.post('/progress/:partnerId/:taskId', (req, res) => {
  const { partnerId, taskId } = req.params;
  let progress = partnerTaskProgress.find((p) => p.partnerId === partnerId && p.taskId === Number(taskId));
  if (!progress) {
    progress = { id: nextId('progress'), partnerId, taskId: Number(taskId), completed: true };
    partnerTaskProgress.push(progress);
  } else {
    progress.completed = true;
  }
  res.json(progress);
});

export default router;
