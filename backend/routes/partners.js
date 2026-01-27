/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';
import { logPartnerAction } from '../utils/partnerAudit.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.partners');

router.use(requireAuth);
router.use(requireDistrictScope);

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

router.get('/profiles', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;

  const result = await safeQuery(
    res,
    `select id, partner_user_id, company_name, contact_name, contact_email, status, metadata, created_at, updated_at
       from public.partner_profiles
      where district_id = $1
        and ($2::uuid is null or partner_user_id = $2::uuid)
      order by created_at desc
      limit 200`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      companyName: row.company_name,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  );
});

router.put('/profiles', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { companyName, contactName, contactEmail, status, metadata } = req.body || {};
  if (!companyName) return res.status(400).json({ error: 'companyName required' });

  const result = await safeQuery(
    res,
    `insert into public.partner_profiles
      (district_id, partner_user_id, company_name, contact_name, contact_email, status, metadata)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb)
     on conflict (district_id, partner_user_id)
     do update set
       company_name = excluded.company_name,
       contact_name = excluded.contact_name,
       contact_email = excluded.contact_email,
       status = excluded.status,
       metadata = excluded.metadata,
       updated_at = now()
     returning id, partner_user_id, company_name, contact_name, contact_email, status, metadata, created_at, updated_at`,
    [districtId, partnerId, companyName, contactName || null, contactEmail || null, status || 'active', JSON.stringify(metadata || {})]
  );
  if (!result) return;

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId,
    actorId: userId,
    action: 'profile_updated',
    entity: 'partner_profile',
    entityId: row.id,
    metadata: { status: row.status }
  });

  res.json({
    id: row.id,
    partnerId: row.partner_user_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    status: row.status,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

router.get('/agreements', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;

  const result = await safeQuery(
    res,
    `select id, partner_user_id, agreement_type, status, signed_at, metadata, created_at, updated_at
       from public.partner_agreements
      where district_id = $1
        and ($2::uuid is null or partner_user_id = $2::uuid)
      order by created_at desc
      limit 200`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      agreementType: row.agreement_type,
      status: row.status,
      signed_at: row.signed_at,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  );
});

router.post('/agreements', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { agreementType, status, metadata } = req.body || {};
  if (!agreementType) return res.status(400).json({ error: 'agreementType required' });

  const result = await safeQuery(
    res,
    `insert into public.partner_agreements
      (district_id, partner_user_id, agreement_type, status, metadata)
     values ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
     returning id, partner_user_id, agreement_type, status, signed_at, metadata, created_at, updated_at`,
    [districtId, partnerId, agreementType, status || 'pending', JSON.stringify(metadata || {})]
  );
  if (!result) return;

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId,
    actorId: userId,
    action: 'agreement_created',
    entity: 'partner_agreement',
    entityId: row.id,
    metadata: { agreementType: row.agreement_type, status: row.status }
  });

  res.status(201).json({
    id: row.id,
    partnerId: row.partner_user_id,
    agreementType: row.agreement_type,
    status: row.status,
    signed_at: row.signed_at,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

router.patch('/agreements/:id', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { status, metadata } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });

  const result = await safeQuery(
    res,
    `update public.partner_agreements
        set status = $2,
            metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
            signed_at = case when $2 = 'signed' then now() else signed_at end,
            updated_at = now()
      where id = $1 and district_id = $4
      returning id, partner_user_id, agreement_type, status, signed_at, metadata, created_at, updated_at`,
    [id, status, JSON.stringify(metadata || {}), districtId]
  );
  if (!result) return;
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId: row.partner_user_id,
    actorId: userId,
    action: 'agreement_updated',
    entity: 'partner_agreement',
    entityId: row.id,
    metadata: { status: row.status }
  });

  res.json({
    id: row.id,
    partnerId: row.partner_user_id,
    agreementType: row.agreement_type,
    status: row.status,
    signed_at: row.signed_at,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

router.get('/payout-settings', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;

  const result = await safeQuery(
    res,
    `select id, partner_user_id, payout_method, payout_currency, account_last4, status, tax_form_status,
            metadata, created_at, updated_at
       from public.partner_payout_settings
      where district_id = $1
        and ($2::uuid is null or partner_user_id = $2::uuid)
      order by created_at desc
      limit 200`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      payoutMethod: row.payout_method,
      payoutCurrency: row.payout_currency,
      accountLast4: row.account_last4,
      status: row.status,
      taxFormStatus: row.tax_form_status,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  );
});

router.put('/payout-settings', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { payoutMethod, payoutCurrency, accountLast4, status, taxFormStatus, metadata } = req.body || {};
  if (!payoutMethod) return res.status(400).json({ error: 'payoutMethod required' });

  const result = await safeQuery(
    res,
    `insert into public.partner_payout_settings
      (district_id, partner_user_id, payout_method, payout_currency, account_last4, status, tax_form_status, metadata)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)
     on conflict (district_id, partner_user_id)
     do update set
       payout_method = excluded.payout_method,
       payout_currency = excluded.payout_currency,
       account_last4 = excluded.account_last4,
       status = excluded.status,
       tax_form_status = excluded.tax_form_status,
       metadata = excluded.metadata,
       updated_at = now()
     returning id, partner_user_id, payout_method, payout_currency, account_last4, status, tax_form_status,
               metadata, created_at, updated_at`,
    [
      districtId,
      partnerId,
      payoutMethod,
      payoutCurrency || 'usd',
      accountLast4 || null,
      status || 'pending',
      taxFormStatus || 'missing',
      JSON.stringify(metadata || {})
    ]
  );
  if (!result) return;

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId,
    actorId: userId,
    action: 'payout_settings_updated',
    entity: 'partner_payout_settings',
    entityId: row.id,
    metadata: { status: row.status, payoutMethod: row.payout_method }
  });

  res.json({
    id: row.id,
    partnerId: row.partner_user_id,
    payoutMethod: row.payout_method,
    payoutCurrency: row.payout_currency,
    accountLast4: row.account_last4,
    status: row.status,
    taxFormStatus: row.tax_form_status,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

export default router;
