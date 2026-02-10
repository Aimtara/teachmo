/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/partners/register', async (req, res) => {
  const {
    orgName,
    website,
    type,
    contactName,
    contactEmail,
    description,
    offeringType,
  } = req.body || {};

  if (!orgName || !contactName || !contactEmail) {
    return res.status(400).json({ error: 'orgName, contactName, and contactEmail are required' });
  }

  const result = await query(
    `insert into public.partner_registration_applications
      (org_name, website, organization_type, contact_name, contact_email, description, offering_type)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, status, created_at`,
    [
      orgName,
      website || null,
      type || null,
      contactName,
      contactEmail,
      description || null,
      offeringType || null,
    ]
  );

  return res.status(201).json({ application: result.rows[0] });
});

export default router;
