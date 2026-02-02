import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { populateSchoolDirectory } from '../integrations/rosterSync';
import { db } from '../db';

const logger = createLogger('SchoolEtlScheduler');

/**
 * Automates the extraction and loading of school directory data
 * from external sources (NCES, State databases).
 */
export function startSchoolDirectoryScheduler() {
  logger.info('Initializing School Directory ETL Scheduler...');

  // Schedule to run every night at 2:00 AM UTC
  // Cron pattern: Minute Hour Day Month DayOfWeek
  cron.schedule('0 2 * * *', async () => {
    const jobId = `job_${Date.now()}`;
    logger.info(`[${jobId}] Starting scheduled School Directory Sync...`);

    try {
      // 1. Create Audit Record
      await db.auditLogs.create({
        event: 'system.etl.start',
        actor: 'system',
        metadata: { jobId, type: 'scheduled' },
      });

      // 2. Trigger the heavy ETL process
      // mode: 'delta' ensures we only fetch updates, not the full dataset
      const result = await populateSchoolDirectory({ mode: 'delta' });

      // 3. Log Success
      logger.info(
        `[${jobId}] Sync completed successfully. Processed ${result.processedCount} records.`,
      );

      await db.auditLogs.create({
        event: 'system.etl.complete',
        actor: 'system',
        metadata: { jobId, stats: result.stats },
      });
    } catch (error) {
      // 4. Handle Failure with Alerting
      logger.error(`[${jobId}] ETL Failed:`, error);

      await db.auditLogs.create({
        event: 'system.etl.failure',
        actor: 'system',
        metadata: {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Future: Integrate with backend/alerts/dispatcher.js to notify admins
    }
  });

  logger.info('School Directory ETL Scheduler is active.');
}
