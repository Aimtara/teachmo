/* eslint-env node */
import { Router } from 'express';
import { families, partnerConsents, students } from '../models.js';
import {
  enforceClassAccess,
  enforceFamilyAccess,
  enforcePartnerAggregation,
  requireRole,
} from '../middleware/authz.js';

const router = Router();

router.get('/families/:familyId', requireRole(['parent']), enforceFamilyAccess, (req, res) => {
  const family = families.find((f) => f.id === req.params.familyId);
  if (!family) return res.status(404).json({ error: 'family not found' });
  const familyStudents = students.filter((s) => s.familyId === family.id);
  res.json({ ...family, students: familyStudents });
});

router.get('/classes/:classId/students', requireRole(['teacher', 'parent']), (req, res, next) => {
  const familyForParent = families.find((f) => f.id === req.user.familyId);
  req.allowedParentClassIds = familyForParent?.classes || [];
  return next();
}, enforceClassAccess, (req, res) => {
  const roster = students.filter((s) => s.classId === req.params.classId);
  res.json({ classId: req.params.classId, students: roster });
});

const aggregateOutcomes = () => {
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
    };
  }
  const averageProgress = students.reduce((sum, s) => sum + s.progress, 0) / totalStudents;
  return {
    totalStudents,
    averageProgress: Number(averageProgress.toFixed(2)),
  };
};

const detailedOutcomes = (partnerId) => {
  const consentedFamilies = partnerConsents
    .filter((c) => c.partnerId === partnerId && new Date(c.expiresAt) > new Date())
    .map((c) => c.familyId);
  return students
    .filter((s) => consentedFamilies.includes(s.familyId))
    .map((s) => ({ id: s.id, classId: s.classId, progress: s.progress, familyId: s.familyId }));
};

router.get('/partners/outcomes', requireRole(['partner']), enforcePartnerAggregation, (req, res) => {
  const aggregated = aggregateOutcomes();
  if (!req.shouldProvideDetail) {
    return res.json({ scope: 'aggregated', aggregated });
  }

  const details = detailedOutcomes(req.user.partnerId);
  return res.json({ scope: 'consented-detail', aggregated, details });
});

export default router;
