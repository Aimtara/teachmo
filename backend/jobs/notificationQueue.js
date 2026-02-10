/* eslint-env node */
import { query as defaultQuery } from '../db.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('notification-queue');

export const DEFAULT_QUEUE_OPTIONS = {
  batchSize: 25,
  maxAttempts: 5,
  baseDelayMs: 30_000,
  maxDelayMs: 30 * 60 * 1000,
};

export function calculateBackoffMs(attempts, options = {}) {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_QUEUE_OPTIONS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_QUEUE_OPTIONS.maxDelayMs;
  const multiplier = Math.pow(2, Math.max(0, attempts));
  return Math.min(baseDelayMs * multiplier, maxDelayMs);
}

export function selectDueMessages(messages, now = new Date()) {
  return (messages || []).filter((message) => {
    if (!message) return false;
    if (!['scheduled', 'pending'].includes(message.status)) return false;
    if (!message.send_at) return true;
    return new Date(message.send_at).getTime() <= now.getTime();
  });
}

export function buildQueueEntries({ messageId, recipients, channel, maxAttempts, now = new Date() }) {
  const sendAt = now instanceof Date ? now : new Date(now);
  return (recipients || []).map((recipient) => ({
    message_id: messageId,
    recipient_id: recipient.id,
    channel,
    status: 'pending',
    attempts: 0,
    max_attempts: maxAttempts,
    next_attempt_at: sendAt.toISOString(),
  }));
}

export function applyRetryPolicy({ attempts, maxAttempts, now = new Date(), options = {} }) {
  const nextAttempts = attempts + 1;
  if (nextAttempts >= maxAttempts) {
    return {
      status: 'dead',
      attempts: nextAttempts,
      next_attempt_at: null,
    };
  }

  const delayMs = calculateBackoffMs(nextAttempts, options);
  return {
    status: 'pending',
    attempts: nextAttempts,
    next_attempt_at: new Date(now.getTime() + delayMs).toISOString(),
  };
}

export function rollupDeliverabilityEvents(events = []) {
  const totals = {
    delivered: 0,
    bounced: 0,
    opened: 0,
    clicked: 0,
    total: events.length,
  };
  for (const event of events) {
    if (!event?.event_type) continue;
    if (event.event_type === 'delivered') totals.delivered += 1;
    if (event.event_type === 'bounced') totals.bounced += 1;
    if (event.event_type === 'opened') totals.opened += 1;
    if (event.event_type === 'clicked') totals.clicked += 1;
  }
  return totals;
}

function normalizeSegment(segment = {}) {
  return {
    roles: Array.isArray(segment.roles) ? segment.roles : [],
    userIds: Array.isArray(segment.user_ids) ? segment.user_ids : [],
    excludeUserIds: Array.isArray(segment.exclude_user_ids) ? segment.exclude_user_ids : [],
    schoolIds: Array.isArray(segment.school_ids) ? segment.school_ids : [],
    districtIds: Array.isArray(segment.district_ids) ? segment.district_ids : [],
    includeDisabled: Boolean(segment.include_disabled),
    grades: Array.isArray(segment.grades) ? segment.grades : (Array.isArray(segment.grade_levels) ? segment.grade_levels : []),
  };
}

async function loadTenantNotificationSettings({ query, organizationId, schoolId }) {
  const result = await query(
    `select settings
     from public.tenant_settings
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by school_id desc nulls last
     limit 1`,
    [organizationId, schoolId ?? null]
  );
  return result.rows?.[0]?.settings ?? {};
}

function validateTenantChannel(settings = {}, channel) {
  if (channel === 'email') {
    const emailSettings = settings.notifications?.email ?? settings.email_security ?? {};
    const spf = String(emailSettings.spf || emailSettings.spf_status || '').toLowerCase();
    const dkim = String(emailSettings.dkim || emailSettings.dkim_status || '').toLowerCase();
    const dmarc = String(emailSettings.dmarc || emailSettings.dmarc_status || '').toLowerCase();
    if ([spf, dkim, dmarc].every((value) => value === 'pass')) return { ok: true };
    return { ok: false, error: 'Email SPF/DKIM/DMARC validation not complete.' };
  }

  if (channel === 'sms') {
    const smsSettings = settings.notifications?.sms ?? settings.sms_opt_in ?? {};
    const optIn = smsSettings.opt_in ?? smsSettings.enabled ?? settings.sms_opt_in;
    if (optIn === true) return { ok: true };
    return { ok: false, error: 'SMS opt-in is required before sending.' };
  }

  return { ok: true };
}



export function buildGradesCondition(startIdx, grades) {
  if (!grades.length) return { sql: '', params: [], nextIdx: startIdx };
  const normalized = grades
    .map((grade) => String(grade || '').trim().toLowerCase())
    .filter(Boolean);
  if (!normalized.length) return { sql: '', params: [], nextIdx: startIdx };

  // user_profiles.grades is free-form text in this codebase, so match common formats like
  // "3", "grade 3", "3rd", and comma-delimited values using case-insensitive checks.
  // Use delimiter-aware regular expressions so that grade "1" does not match "10", "11", etc.
  const sql = `exists (
    select 1
    from unnest($${startIdx}::text[]) as g
    where lower(coalesce(p.grades, '')) ~ ('(^|\\D)' || g || '(\\D|$)')
       or lower(coalesce(p.grades, '')) ~ ('(^|\\W)grade ' || g || '(\\W|$)')
       or lower(coalesce(p.grades, '')) ~ ('(^|\\D)' || g || '(st|nd|rd|th)(\\D|$)')
  )`;

  return { sql, params: [normalized], nextIdx: startIdx + 1 };
}

async function loadRecipients({ query, organizationId, schoolId, segment }) {
  const normalized = normalizeSegment(segment);
  const conditions = ['p.district_id = $1'];
  const params = [organizationId];
  let idx = params.length + 1;

  if (schoolId) {
    conditions.push(`p.school_id = $${idx++}`);
    params.push(schoolId);
  }

  if (normalized.schoolIds.length) {
    conditions.push(`p.school_id = any($${idx++}::uuid[])`);
    params.push(normalized.schoolIds);
  }

  if (normalized.districtIds.length) {
    conditions.push(`p.district_id = any($${idx++}::uuid[])`);
    params.push(normalized.districtIds);
  }

  if (normalized.roles.length) {
    conditions.push(`p.role = any($${idx++}::text[])`);
    params.push(normalized.roles);
  }

  const gradeCondition = buildGradesCondition(idx, normalized.grades);
  if (gradeCondition.sql) {
    conditions.push(gradeCondition.sql);
    params.push(...gradeCondition.params);
    idx = gradeCondition.nextIdx;
  }

  if (normalized.userIds.length) {
    conditions.push(`u.id = any($${idx++}::uuid[])`);
    params.push(normalized.userIds);
  }

  if (normalized.excludeUserIds.length) {
    conditions.push(`u.id <> all($${idx++}::uuid[])`);
    params.push(normalized.excludeUserIds);
  }

  if (!normalized.includeDisabled) {
    conditions.push('(u.disabled is null or u.disabled = false)');
  }

  const sql = `
    select u.id, u.email, p.role, p.school_id, p.district_id
    from auth.users u
    join public.user_profiles p on p.user_id = u.id
    where ${conditions.join(' and ')}
    order by u.created_at asc
    limit 5000
  `;

  const result = await query(sql, params);
  return result.rows || [];
}

async function insertQueueEntries({ query, entries }) {
  if (!entries.length) return { inserted: 0 };
  const values = [];
  const params = [];
  let idx = 1;
  for (const entry of entries) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(
      entry.message_id,
      entry.recipient_id,
      entry.channel,
      entry.status,
      entry.attempts,
      entry.max_attempts,
      entry.next_attempt_at
    );
  }
  const result = await query(
    `insert into public.notification_queue
     (message_id, recipient_id, channel, status, attempts, max_attempts, next_attempt_at)
     values ${values.join(', ')}
     on conflict do nothing`,
    params
  );
  return { inserted: result.rowCount || 0 };
}

export async function enqueueMessage({ query = defaultQuery, messageId, now = new Date() }) {
  const result = await query(
    `select id, organization_id, school_id, channel, segment, status
     from public.notification_messages
     where id = $1`,
    [messageId]
  );
  const message = result.rows?.[0];
  if (!message) return { enqueued: 0, status: 'missing' };

  const recipients = await loadRecipients({
    query,
    organizationId: message.organization_id,
    schoolId: message.school_id,
    segment: message.segment,
  });

  if (!recipients.length) {
    await query(
      `update public.notification_messages
       set status = 'no_recipients', updated_at = now()
       where id = $1`,
      [message.id]
    );
    return { enqueued: 0, status: 'no_recipients' };
  }

  const entries = buildQueueEntries({
    messageId: message.id,
    recipients,
    channel: message.channel,
    maxAttempts: DEFAULT_QUEUE_OPTIONS.maxAttempts,
    now,
  });
  const insertion = await insertQueueEntries({ query, entries });
  await query(
    `update public.notification_messages
     set status = 'queued', updated_at = now()
     where id = $1`,
    [message.id]
  );
  return { enqueued: insertion.inserted, status: 'queued' };
}

export async function enqueueDueMessages({ query = defaultQuery, now = new Date(), limit = 20 }) {
  const dueResult = await query(
    `select id
     from public.notification_messages
     where status in ('scheduled', 'pending')
       and (send_at is null or send_at <= $1)
     order by send_at asc nulls first
     limit $2`,
    [now.toISOString(), limit]
  );

  const ids = dueResult.rows?.map((row) => row.id) || [];
  const results = [];
  for (const id of ids) {
    results.push(await enqueueMessage({ query, messageId: id, now }));
  }
  return results;
}

export async function processQueueBatch({
  query = defaultQuery,
  now = new Date(),
  limit = DEFAULT_QUEUE_OPTIONS.batchSize,
  options = {},
  sendNotification = defaultSendNotification,
}) {
  const pending = await query(
    `select q.id as queue_id,
            q.message_id,
            q.recipient_id,
            q.channel,
            q.attempts,
            q.max_attempts,
            q.next_attempt_at,
            m.organization_id,
            m.school_id,
            m.title,
            m.body,
            m.payload
     from public.notification_queue q
     join public.notification_messages m on m.id = q.message_id
     where q.status = 'pending'
       and q.next_attempt_at <= $1
     order by q.created_at asc
     limit $2`,
    [now.toISOString(), limit]
  );

  const processed = [];
  for (const row of pending.rows || []) {
    const validationSettings = await loadTenantNotificationSettings({
      query,
      organizationId: row.organization_id,
      schoolId: row.school_id,
    });
    const validation = validateTenantChannel(validationSettings, row.channel);
    if (!validation.ok) {
      await query(
        `update public.notification_queue
         set status = 'dead', last_error = $2, updated_at = now()
         where id = $1`,
        [row.queue_id, validation.error]
      );
      await query(
        `insert into public.notification_dead_letters
         (queue_id, message_id, recipient_id, channel, error)
         values ($1, $2, $3, $4, $5)`,
        [row.queue_id, row.message_id, row.recipient_id, row.channel, validation.error]
      );
      processed.push({ id: row.queue_id, status: 'dead', error: validation.error });
      continue;
    }

    try {
      const sendResult = await sendNotification({
        channel: row.channel,
        recipientId: row.recipient_id,
        message: row,
      });
      const delivery = await query(
        `insert into public.notification_deliveries
         (message_id, recipient_id, channel, status, provider_response, delivered_at)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         returning id`,
        [
          row.message_id,
          row.recipient_id,
          row.channel,
          sendResult.status,
          JSON.stringify(sendResult.providerResponse || {}),
          sendResult.deliveredAt || now.toISOString(),
        ]
      );

      const deliveryId = delivery.rows?.[0]?.id;
      const events = sendResult.events?.length ? sendResult.events : ['delivered'];
      const eventValues = [];
      const eventParams = [];
      let eventIdx = 1;
      for (const eventType of events) {
        eventValues.push(`($${eventIdx++}, $${eventIdx++}, $${eventIdx++}, $${eventIdx++})`);
        eventParams.push(deliveryId, row.message_id, row.recipient_id, eventType);
      }
      if (eventValues.length) {
        await query(
          `insert into public.notification_events
           (delivery_id, message_id, recipient_id, event_type)
           values ${eventValues.join(', ')}`,
          eventParams
        );
      }

      await query(
        `update public.notification_queue
         set status = 'sent', updated_at = now()
         where id = $1`,
        [row.queue_id]
      );
      processed.push({ id: row.queue_id, status: 'sent' });
    } catch (error) {
      const policy = applyRetryPolicy({
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        now,
        options,
      });

      if (policy.status === 'dead') {
        await query(
          `update public.notification_queue
           set status = 'dead', attempts = $2, last_error = $3, updated_at = now()
           where id = $1`,
          [row.queue_id, policy.attempts, error?.message || 'send failed']
        );
        await query(
          `insert into public.notification_dead_letters
           (queue_id, message_id, recipient_id, channel, error)
           values ($1, $2, $3, $4, $5)`,
          [row.queue_id, row.message_id, row.recipient_id, row.channel, error?.message || 'send failed']
        );
        processed.push({ id: row.queue_id, status: 'dead' });
      } else {
        await query(
          `update public.notification_queue
           set status = $2, attempts = $3, next_attempt_at = $4, last_error = $5, updated_at = now()
           where id = $1`,
          [
            row.queue_id,
            policy.status,
            policy.attempts,
            policy.next_attempt_at,
            error?.message || 'send failed',
          ]
        );
        processed.push({ id: row.queue_id, status: 'retry' });
      }
    }
  }

  await updateMessageStatuses({ query });
  return processed;
}

async function updateMessageStatuses({ query }) {
  await query(
    `update public.notification_messages m
     set status = case
       when exists (
         select 1 from public.notification_queue q
         where q.message_id = m.id and q.status in ('pending', 'processing')
       ) then 'processing'
       when exists (
         select 1 from public.notification_queue q
         where q.message_id = m.id and q.status = 'dead'
       ) then 'partial_failed'
       when exists (
         select 1 from public.notification_queue q
         where q.message_id = m.id and q.status = 'sent'
       ) then 'sent'
       else m.status
     end,
     updated_at = now()
     where m.status in ('queued', 'processing')`
  );
}

export async function defaultSendNotification({ channel, recipientId, message }) {
  const simulate = message?.payload?.simulate || {};
  if (simulate.error === 'temporary') {
    const error = new Error('temporary send failure');
    error.code = 'TEMP_FAIL';
    throw error;
  }

  const status = simulate.status || 'delivered';
  const events = Array.isArray(simulate.events) && simulate.events.length
    ? simulate.events
    : [status === 'bounced' ? 'bounced' : 'delivered'];

  return {
    status,
    deliveredAt: new Date().toISOString(),
    providerResponse: {
      simulated: true,
      channel,
      recipientId,
    },
    events,
  };
}

export function startNotificationQueueScheduler({
  processIntervalMs = Number(process.env.NOTIFICATION_QUEUE_PROCESS_INTERVAL_MS || 15000),
  scheduleIntervalMs = Number(process.env.NOTIFICATION_QUEUE_SCHEDULE_INTERVAL_MS || 60000),
} = {}) {
  const enabled = String(process.env.NOTIFICATION_QUEUE_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return null;

  const processTimer = setInterval(() => {
    processQueueBatch({}).catch((error) => {
      logger.error('Process failed', error);
    });
  }, processIntervalMs);

  const scheduleTimer = setInterval(() => {
    enqueueDueMessages({}).catch((error) => {
      logger.error('Schedule failed', error);
    });
  }, scheduleIntervalMs);

  return { processTimer, scheduleTimer };
}
