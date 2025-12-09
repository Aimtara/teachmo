/* eslint-env node */
import { Router } from 'express';
import { classes, dataSubjectRequests, families, students, nextId } from '../models.js';
import { requireRole } from '../middleware/authz.js';

const router = Router();

const buildFamilyDataExport = (familyId) => {
  const family = families.find((f) => f.id === familyId);
  if (!family) return null;

  const studentRecords = students.filter((s) => s.familyId === family.id);
  const classRecords = classes.filter((c) => family.classes.includes(c.id));

  return {
    family,
    students: studentRecords,
    classes: classRecords,
    exportedAt: new Date().toISOString(),
  };
};

router.get('/export', requireRole(['parent']), (req, res) => {
  const { familyId } = req.user;
  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required to export data' });
  }

  const exportPayload = buildFamilyDataExport(familyId);
  if (!exportPayload) {
    return res.status(404).json({ error: 'family data not found' });
  }

  return res.json({
    scope: 'family',
    familyId,
    data: exportPayload,
    guidance: 'Share this export with your school or district only through secure channels.',
  });
});

router.post('/delete', requireRole(['parent']), (req, res) => {
  const { familyId, id: requesterId } = req.user;
  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required to request deletion' });
  }

  const existingFamily = families.find((f) => f.id === familyId);
  if (!existingFamily) {
    return res.status(404).json({ error: 'family data not found for deletion' });
  }

  const requestRecord = {
    id: `data-request-${nextId('dataRequest')}`,
    type: 'erasure',
    familyId,
    requestedBy: requesterId,
    status: 'pending-review',
    receivedAt: new Date().toISOString(),
    notes: 'This in-memory demo queues the request; production systems must propagate deletion to all processors and backups.',
  };

  dataSubjectRequests.push(requestRecord);

  return res.status(202).json({
    message: 'Deletion/erasure request received and queued for processing.',
    request: requestRecord,
  });
});

router.get('/requests', requireRole(['parent']), (req, res) => {
  const { familyId } = req.user;
  const requests = dataSubjectRequests.filter((r) => r.familyId === familyId);
  return res.json({ requests });
});

export default router;
