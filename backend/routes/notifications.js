/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { enqueueMessage } from '../jobs/notificationQueue.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);

router.get('/notifications/announcements', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const result = await query(
    `select m.*,
            coalesce(sent.count, 0) as sent_count,
            coalesce(bounced.count, 0) as bounced_count
     from public.notification_messages m
     left join (
       select message_id, count(*) as count
       from public.notification_deliveries
       where status = 'delivered'
       group by message_id
     ) sent on sent.message_id = m.id
     left join (
       select message_id, count(*) as count
       from public.notification_events
       where event_type = 'bounced'
       group by message_id
     ) bounced on bounced.message_id = m.id
     where m.organization_id = $1
       and (m.school_id is null or m.school_id = $2)
     order by m.created_at desc
     limit 100`,
    [organizationId, schoolId ?? null]
  );
  res.json({ announcements: result.rows || [] });
});

router.post('/notifications/announcements', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { channel, title, body, segment, send_at, payload } = req.body || {};
  if (!channel || !['email', 'sms', 'push'].includes(channel)) {
    return res.status(400).json({ error: 'channel is required' });
  }
  if (!body) {
    return res.status(400).json({ error: 'body is required' });
  }

  const sendAt = send_at ? new Date(send_at) : null;
  const status = sendAt && sendAt.getTime() > Date.now() ? 'scheduled' : 'pending';
  const result = await query(
    `insert into public.notification_messages
     (organization_id, school_id, channel, title, body, payload, segment, send_at, status, created_by)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
     returning *`,
    [
      organizationId,
      schoolId ?? null,
      channel,
      title || null,
      body,
      JSON.stringify(payload || {}),
      JSON.stringify(segment || {}),
      sendAt ? sendAt.toISOString() : null,
      status,
      req.auth?.userId || null,
    ]
  );
  const message = result.rows?.[0];
  if (status === 'pending' && message?.id) {
    await enqueueMessage({ messageId: message.id });
  }
  res.json({ announcement: message });
});

router.get('/notifications/announcements/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const result = await query(
    `select m.*,
            coalesce(sent.count, 0) as sent_count,
            coalesce(events.opened, 0) as opened_count,
            coalesce(events.clicked, 0) as clicked_count,
            coalesce(events.bounced, 0) as bounced_count
     from public.notification_messages m
     left join (
       select message_id, count(*) as count
       from public.notification_deliveries
       where status = 'delivered'
       group by message_id
     ) sent on sent.message_id = m.id
     left join (
       select message_id,
              sum(case when event_type = 'opened' then 1 else 0 end) as opened,
              sum(case when event_type = 'clicked' then 1 else 0 end) as clicked,
              sum(case when event_type = 'bounced' then 1 else 0 end) as bounced
       from public.notification_events
       group by message_id
     ) events on events.message_id = m.id
     where m.id = $1
       and m.organization_id = $2
       and (m.school_id is null or m.school_id = $3)
     limit 1`,
    [req.params.id, organizationId, schoolId ?? null]
  );
  if (!result.rows?.length) return res.status(404).json({ error: 'not found' });
  res.json({ announcement: result.rows[0] });
});

router.get('/notifications/metrics', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { start, end, channel } = req.query || {};
  const params = [organizationId, schoolId ?? null];
  let idx = params.length + 1;
  const filters = [
    'm.organization_id = $1',
    '(m.school_id is null or m.school_id = $2)',
  ];
  if (channel) {
    filters.push(`m.channel = $${idx++}`);
    params.push(channel);
  }
  if (start) {
    filters.push(`e.event_ts >= $${idx++}`);
    params.push(new Date(start).toISOString());
  }
  if (end) {
    filters.push(`e.event_ts <= $${idx++}`);
    params.push(new Date(end).toISOString());
  }

  const result = await query(
    `select
        sum(case when e.event_type = 'delivered' then 1 else 0 end) as delivered,
        sum(case when e.event_type = 'bounced' then 1 else 0 end) as bounced,
        sum(case when e.event_type = 'opened' then 1 else 0 end) as opened,
        sum(case when e.event_type = 'clicked' then 1 else 0 end) as clicked,
        count(*) as total_events
     from public.notification_events e
     join public.notification_messages m on m.id = e.message_id
     where ${filters.join(' and ')}`,
    params
  );
  res.json({ metrics: result.rows?.[0] || {} });
});

export default router;
