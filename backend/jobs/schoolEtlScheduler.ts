import cron from 'node-cron';
import { createLogger } from '../utils/logger.js';
import { listRosterSources, runRosterSync } from '../integrations/rosterSync.js';
import { query } from '../db.js';

const logger = createLogger('SchoolEtlScheduler');

interface RosterSource {
  id: string;
  isEnabled?: boolean;
}

interface RosterRunResult {
  stats?: Record<string, unknown>;
}

type RosterSyncFn = (_params: {
  sourceId: string;
  records: readonly unknown[];
  options: Record<string, unknown>;
  triggeredBy: string;
  simulateFailure?: boolean;
}) => RosterRunResult;

interface SchoolDirectorySyncResult {
  processedCount: number;
  stats: Record<string, unknown>;
}

async function recordSchedulerAudit(event: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    await query(
      `insert into public.audit_log
        (actor_id, action, entity_type, entity_id, metadata, contains_pii)
       values ($1, $2, $3, $4, $5::jsonb, false)`,
      [null, event, 'system', 'school_directory_etl', JSON.stringify(metadata)],
    );
  } catch (error) {
    logger.warn('Scheduler audit write skipped', {
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function populateSchoolDirectory({ mode }: { mode: 'delta' | 'full' }): Promise<SchoolDirectorySyncResult> {
  const sources = listRosterSources() as RosterSource[];
  const source = sources.find((item) => item.isEnabled !== false) ?? sources[0] ?? null;

  if (!source) {
    return {
      processedCount: 0,
      stats: {
        mode,
        skipped: 'no_roster_source_configured',
      },
    };
  }

  const runRosterSyncTyped = runRosterSync as unknown as RosterSyncFn;
  const result = runRosterSyncTyped({
    sourceId: source.id,
    records: [],
    options: { mode },
    triggeredBy: 'scheduled',
  });

  return {
    processedCount: Number(result.stats?.totalRows ?? result.stats?.totalValid ?? 0),
    stats: result.stats ?? {},
  };
}

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
      await recordSchedulerAudit('system.etl.start', { jobId, type: 'scheduled' });

      // 2. Trigger the heavy ETL process
      // mode: 'delta' ensures we only fetch updates, not the full dataset
      const result = await populateSchoolDirectory({ mode: 'delta' });

      // 3. Log Success
      logger.info(
        `[${jobId}] Sync completed successfully. Processed ${result.processedCount} records.`,
      );

      await recordSchedulerAudit('system.etl.complete', { jobId, stats: result.stats });
    } catch (error) {
      // 4. Handle Failure with Alerting
      logger.error(`[${jobId}] ETL Failed:`, error);

      await recordSchedulerAudit('system.etl.failure', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Future: Integrate with backend/alerts/dispatcher.js to notify admins
    }
  });

  logger.info('School Directory ETL Scheduler is active.');
}
