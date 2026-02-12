import { Router } from 'express';
import { query } from '../db.js';
import { scanContent } from '../utils/contentSafety.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function normalizeSubmissionPayload(body = {}) {
  const title = body.title ?? body.programName ?? null;
  const description = body.description ?? body.details ?? null;
  const type = body.type ?? 'general';

  return {
    type,
    title,
    description,
    content: body.content && typeof body.content === 'object' ? body.content : {},
  };
}

async function createSubmission(req, res) {
  try {
    const { type, title, description, content } = normalizeSubmissionPayload(req.body);
    const partnerId = req.user?.partnerId || req.auth?.userId;

    if (!partnerId) {
      return res.status(401).json({ error: 'Partner identity missing' });
    }

    const safetyCheck = scanContent({ title, description, content });
    const initialStatus = safetyCheck.isSafe ? 'pending_content_review' : 'flagged_for_safety';

    const result = await query(
      `INSERT INTO public.partner_submissions
       (partner_id, type, title, content, status, safety_flags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, status, safety_flags`,
      [partnerId, type, title, { description, ...content }, initialStatus, JSON.stringify(safetyCheck.flags)],
    );

    const submission = result.rows[0] || {};
    const flags = Array.isArray(submission.safety_flags)
      ? submission.safety_flags
      : JSON.parse(submission.safety_flags || '[]');

    return res.status(201).json({
      ...submission,
      accepted: submission.status === 'pending_content_review',
      flags,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Failed to process submission' });
  }
}

// Secure endpoint for authenticated partners
router.post('/partners/submissions', requireAuth, createSubmission);

// Backward-compatible endpoint path for legacy clients
router.post('/', requireAuth, createSubmission);

export default router;
