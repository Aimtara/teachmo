/* eslint-env node */
import { query } from '../db.js';
import { createLogger } from './logger.js';

const logger = createLogger('partner-audit');

export async function logPartnerAction({
  districtId,
  partnerId,
  actorId,
  action,
  entity,
  entityId,
  metadata = {},
}) {
  if (!districtId || !partnerId || !action) return;
  try {
    await query(
      `insert into public.partner_action_audits
        (district_id, partner_user_id, actor_id, action, entity, entity_id, metadata)
       values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, $7::jsonb)`,
      [districtId, partnerId, actorId || null, action, entity || null, entityId || null, JSON.stringify(metadata)]
    );
    return true;
  } catch (error) {
    logger.error('Failed to log action', error);
    return false;
  }
}
