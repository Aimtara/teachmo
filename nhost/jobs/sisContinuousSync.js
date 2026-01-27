/*
 * Nhost scheduled job: Continuous SIS/LMS sync
 *
 * This job runs periodically (e.g., every 10 minutes) to check tenants configured
 * with realtime or high-frequency roster sync modes.  For each configured
 * tenant/provider, it calls the internal sync function to fetch roster
 * updates from the provider and apply them to the database.  Role assignment
 * is handled using the SIS role mapping stored in the database.  A sync
 * result record is inserted into sis_sync_jobs for reporting.
 */

const { hasuraRequest } = require('../utils/hasura');
const { callFunction } = require('../utils/nhost');
const logger = require('../utils/logger').createLogger('sisContinuousSync');

module.exports = async function sisContinuousSync(event, context) {
  try {
    const { sis_sync_config } = await hasuraRequest(`query GetRealtimeConfigs {
      sis_sync_config(where: {mode: {_in: ["realtime", "hourly"]}}) { organization_id provider mode }
    }`);
    for (const config of sis_sync_config) {
      try {
        await callFunction('admin-sis-run-sync', { provider: config.provider, organizationId: config.organization_id });
        await hasuraRequest(`mutation InsertJob { insert_sis_sync_jobs_one(object: { organization_id: "${config.organization_id}", provider: "${config.provider}", mode: "${config.mode}", status: "queued" }) { id } }`);
      } catch (err) {
        logger.error(`Failed to sync ${config.provider} for org ${config.organization_id}`, err);
        await hasuraRequest(`mutation InsertJob { insert_sis_sync_jobs_one(object: { organization_id: "${config.organization_id}", provider: "${config.provider}", mode: "${config.mode}", status: "error" }) { id } }`);
      }
    }
  } catch (err) {
    logger.error('Failed to run continuous SIS sync job', err);
  }
};
