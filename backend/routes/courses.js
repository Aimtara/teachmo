/* eslint-env node */
import { Router } from 'express';
import { trainingCourses, trainingModules, courseEnrollments, nextId } from '../models.js';

const router = Router();

// list courses with modules
router.get('/', (req, res) => {
  const courses = trainingCourses.map((c) => ({
    ...c,
    modules: trainingModules.filter((m) => m.courseId === c.id),
  }));
  res.json(courses);
});

// create course (admin)
router.post('/', (req, res) => {
  const { title, description, category, difficulty } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const course = {
    id: nextId('course'),
    title,
    description: description || '',
    category: category || 'general',
    difficulty: difficulty || 'beginner',
  };
  trainingCourses.push(course);
  res.status(201).json(course);
});

// add module to course (admin)
router.post('/:courseId/modules', (req, res) => {
  const { courseId } = req.params;
  const { title, content, order } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const module = {
    id: nextId('module'),
    courseId: Number(courseId),
    title,
    content: content || '',
    order: order || 0,
  };
  trainingModules.push(module);
  res.status(201).json(module);
});

// enroll in course
router.post('/:courseId/enroll', (req, res) => {
  const { courseId } = req.params;
  const { partnerId } = req.body;
  if (!partnerId) return res.status(400).json({ error: 'partnerId required' });
  const existing = courseEnrollments.find((e) => e.courseId === Number(courseId) && e.partnerId === partnerId);
  if (existing) return res.status(400).json({ error: 'already enrolled' });
  const enrollment = {
    id: nextId('enrollment'),
    courseId: Number(courseId),
    partnerId,
    completedModules: [],
  };
  courseEnrollments.push(enrollment);
  res.status(201).json(enrollment);
});

// get enrollments for partner
router.get('/enrollments/:partnerId', (req, res) => {
  const { partnerId } = req.params;
  const enrolls = courseEnrollments.filter((e) => e.partnerId === partnerId);
  res.json(enrolls);
});

// complete module
router.post('/:courseId/modules/:moduleId/complete', (req, res) => {
  const { courseId, moduleId } = req.params;
  const { partnerId } = req.body;
  const enrollment = courseEnrollments.find((e) => e.courseId === Number(courseId) && e.partnerId === partnerId);
  if (!enrollment) return res.status(404).json({ error: 'enrollment not found' });
  if (!enrollment.completedModules.includes(Number(moduleId))) {
    enrollment.completedModules.push(Number(moduleId));
  }
  res.json(enrollment);
});

export default router;
