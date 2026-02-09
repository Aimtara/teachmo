/* eslint-env node */
import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { buildAuditExportCsv } from '../functions/audit-export.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);

router.post('/audit-export', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { search, limit = 500, offset = 0 } = req.body || {};

  try {
    const csv = await buildAuditExportCsv({
      organizationId,
      schoolId,
      search,
      limit,
      offset,
    });

    res.setHeader('content-type', 'text/csv');
    res.setHeader(
      'content-disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ error: 'audit_export_failed' });
  }
});

export default router;
