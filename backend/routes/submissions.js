import { Router } from 'express';
import { query } from '../db.js';
import { scanContent } from '../utils/contentSafety.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Secure endpoint for authenticated partners
router.post('/partners/submissions', requireAuth, async (req, res) => {
  try {
    const { type, title, description, content } = req.body;
    const partnerId = req.user?.partnerId || req.auth?.userId;

    if (!partnerId) {
      return res.status(401).json({ error: 'Partner identity missing' });
    }

    // 1. Run Automated Safety Scan
    const safetyCheck = scanContent({ title, description, content });

    // 2. Determine Initial Status
    // If flagged, it goes to "Safety Review". If clean, it goes to "Content Review".
    const initialStatus = safetyCheck.isSafe ? 'pending_content_review' : 'flagged_for_safety';

    // 3. Insert into DB
    const result = await query(
      `INSERT INTO public.partner_submissions
       (partner_id, type, title, content, status, safety_flags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, status, safety_flags`,
      [partnerId, type, title, { description, ...content }, initialStatus, JSON.stringify(safetyCheck.flags)],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

export default router;
