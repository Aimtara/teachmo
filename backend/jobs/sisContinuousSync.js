/* eslint-env node */
import { query } from '../db.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('sis-continuous-sync');
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

function parseCronEveryMinutes(cronExpression) {
  const cron = String(cronExpression || '').trim();
  if (!cron) return null;
  const match = cron.match(/^\*\/(\d+)\s+/);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

async function runSisContinuousSyncCycle() {
  const sources = await query(
    `select id, district_id, school_id, source_type, schedule_cron, last_run_at
     from public.directory_sources
     where is_enabled = true
       and source_type in ('oneroster', 'oneroster_rest', 'classlink_roster_server')`
  );

  for (const source of sources.rows || []) {
    const everyMinutes = parseCronEveryMinutes(source.schedule_cron) || 60;
    const lastRunTs = source.last_run_at ? new Date(source.last_run_at).getTime() : 0;
    const due = Date.now() - lastRunTs >= everyMinutes * 60 * 1000;
    if (!due) continue;

    try {
      await query(
        `insert into public.sis_import_jobs
          (organization_id, school_id, roster_type, source, status, metadata, started_at)
         values ($1, $2, 'delta', $3, 'queued', $4::jsonb, now())`,
        [
          source.district_id,
          source.school_id,
          source.source_type,
          JSON.stringify({ triggeredBy: 'cron', sourceId: source.id, scheduleCron: source.schedule_cron }),
        ]
      );

      await query(
        `update public.directory_sources
         set last_run_at = now(), updated_at = now()
         where id = $1`,
        [source.id]
      );
    } catch (error) {
      logger.error('Failed queuing scheduled SIS import job', {
        sourceId: source.id,
        error: error?.message,
      });
    }
  }
}

export function startSisContinuousSyncScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  // Default to disabled - explicit opt-in required via env var
  const enabled = String(process.env.SIS_CONTINUOUS_SYNC_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    logger.info('SIS continuous sync scheduler is disabled. Set SIS_CONTINUOUS_SYNC_ENABLED=true to enable.');
    return null;
  }

  const timer = setInterval(() => {
    runSisContinuousSyncCycle().catch((error) => {
      logger.error('SIS continuous sync scheduler cycle failed', error);
    });
  }, intervalMs);

  logger.info('SIS continuous sync scheduler started', { intervalMs });
  return timer;
}

export { runSisContinuousSyncCycle };
