import { sendEmail } from '../_shared/email';
import { HasuraClient } from '../_shared/directoryImportCore';

const DIGEST_KIND = 'daily_digest';
const DIGEST_CHANNEL = 'email';

function normalizeBaseUrl(value?: string | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function normalizeTimezone(timezone?: string | null): string {
  const value = String(timezone || '').trim();
  return value || 'America/New_York';
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const localeString = date.toLocaleString('en-US', { timeZone });
    const utcString = date.toLocaleString('en-US', { timeZone: 'UTC' });
    return new Date(localeString).getTime() - new Date(utcString).getTime();
  } catch (error) {
    console.error('Failed to compute timezone offset', error);
    return 0;
  }
}

function toLocalDate(date: Date, timeZone: string): Date {
  const offset = getTimezoneOffsetMs(date, timeZone);
  return new Date(date.getTime() + offset);
}

function isWithinQuietHours(date: Date, start?: number | null, end?: number | null, timeZone?: string | null): boolean {
  if (start === null || end === null || start === undefined || end === undefined) return false;
  const startHour = Number(start);
  const endHour = Number(end);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return false;
  if (startHour === endHour) return false;

  const localDate = toLocalDate(date, normalizeTimezone(timeZone));
  const hour = localDate.getUTCHours();

  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDigestMode(mode?: string | null) {
  return String(mode || 'immediate').toLowerCase();
}

function computeDigestWindow(params: { digestHour?: number | null; timezone?: string | null }, now: Date) {
  const digestHourRaw = Number(params.digestHour);
  const digestHour = Number.isFinite(digestHourRaw) ? digestHourRaw : 7;
  const timeZone = normalizeTimezone(params.timezone);
  const offsetNow = getTimezoneOffsetMs(now, timeZone);
  const localNow = new Date(now.getTime() + offsetNow);

  let endLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), digestHour, 0, 0)
  );
  if (localNow.getUTCHours() < digestHour) {
    endLocal.setUTCDate(endLocal.getUTCDate() - 1);
  }

  const startLocal = new Date(endLocal.getTime() - 24 * 60 * 60 * 1000);

  const endUtc = new Date(endLocal.getTime() - getTimezoneOffsetMs(endLocal, timeZone));
  const startUtc = new Date(startLocal.getTime() - getTimezoneOffsetMs(startLocal, timeZone));

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
    windowStartDate: formatDateOnly(startLocal),
    windowEndDate: formatDateOnly(endLocal),
  };
}

async function ensureOutbox(params: {
  hasura: HasuraClient;
  userId: string;
  windowStart: string;
  windowEnd: string;
}) {
  const { hasura, userId, windowStart, windowEnd } = params;
  const insertResp = await hasura(
    `mutation QueueDigest($object: notification_outbox_insert_input!) {
      insert_notification_outbox_one(
        object: $object,
        on_conflict: {
          constraint: notification_outbox_user_id_channel_kind_window_start_window_end_key,
          update_columns: []
        }
      ) { id status }
    }`,
    {
      object: {
        user_id: userId,
        channel: DIGEST_CHANNEL,
        kind: DIGEST_KIND,
        window_start: windowStart,
        window_end: windowEnd,
        status: 'queued',
      },
    }
  );

  const inserted = insertResp?.data?.insert_notification_outbox_one;
  if (inserted?.id) return inserted;

  const existingResp = await hasura(
    `query ExistingOutbox($userId: uuid!, $windowStart: date!, $windowEnd: date!, $channel: String!, $kind: String!) {
      notification_outbox(
        where: {
          user_id: { _eq: $userId },
          channel: { _eq: $channel },
          kind: { _eq: $kind },
          window_start: { _eq: $windowStart },
          window_end: { _eq: $windowEnd }
        },
        limit: 1
      ) {
        id
        status
      }
    }`,
    { userId, windowStart, windowEnd, channel: DIGEST_CHANNEL, kind: DIGEST_KIND }
  );

  const existing = existingResp?.data?.notification_outbox?.[0];
  if (!existing?.id) return null;

  if (existing.status !== 'queued') {
    const resetResp = await hasura(
      `mutation ResetOutbox($id: uuid!) {
        update_notification_outbox_by_pk(pk_columns: { id: $id }, _set: { status: "queued", error: null, sent_at: null }) {
          id
          status
        }
      }`,
      { id: existing.id }
    );
    return resetResp?.data?.update_notification_outbox_by_pk ?? existing;
  }

  return existing;
}

async function markOutboxStatus(
  hasura: HasuraClient,
  params: { id: string; status: string; error?: string | null; sentAt?: string | null }
) {
  const { id, status, error = null, sentAt = null } = params;
  await hasura(
    `mutation UpdateOutbox($id: uuid!, $status: String!, $error: String, $sentAt: timestamptz) {
      update_notification_outbox_by_pk(pk_columns: { id: $id }, _set: { status: $status, error: $error, sent_at: $sentAt }) {
        id
      }
    }`,
    { id, status, error, sentAt }
  );
}

function buildDigestEmail(params: {
  notifications: Array<{ type?: string | null; severity?: string | null; title?: string | null; created_at?: string | null }>;
  baseUrl: string;
}) {
  const { notifications, baseUrl } = params;
  const total = notifications.length;
  const typeCounts = notifications.reduce(
    (acc, item) => {
      const type = String(item.type || 'other');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const severityCounts = notifications.reduce(
    (acc, item) => {
      const severity = String(item.severity || 'info');
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryParts: string[] = [];
  const syncFailed = typeCounts['directory.sync_failed'] || 0;
  const needsApproval = typeCounts['directory.needs_approval'] || 0;
  const needsReview = typeCounts['directory.needs_review'] || 0;

  if (syncFailed) summaryParts.push(`${syncFailed} sync failure${syncFailed === 1 ? '' : 's'}`);
  if (needsApproval) summaryParts.push(`${needsApproval} approval${needsApproval === 1 ? '' : 's'} pending`);
  if (needsReview) summaryParts.push(`${needsReview} preview${needsReview === 1 ? '' : 's'} to review`);

  const summaryLabel = summaryParts.length > 0 ? summaryParts.join(', ') : `${total} directory alert${total === 1 ? '' : 's'}`;
  const subject = `Teachmo Daily Digest: ${summaryLabel}`;

  const lines: string[] = [];
  lines.push(`You have ${total} unread directory alert${total === 1 ? '' : 's'} from the last day.`);
  lines.push(`Severity: critical ${severityCounts.critical || 0}, warning ${severityCounts.warning || 0}, info ${severityCounts.info || 0}.`);

  const sample = notifications.slice(0, 5);
  if (sample.length > 0) {
    lines.push('Highlights:');
    sample.forEach((item) => {
      const title = item.title || item.type || 'Directory alert';
      const createdAt = item.created_at ? new Date(item.created_at).toLocaleString() : '';
      lines.push(`• ${title}${createdAt ? ` (${createdAt})` : ''}`);
    });
  }

  const notificationsLink = baseUrl ? `${baseUrl}/notifications` : '';
  const approvalsLink = baseUrl ? `${baseUrl}/admin/directory-approvals` : '';
  const sourcesLink = baseUrl ? `${baseUrl}/admin/directory-sources` : '';

  if (notificationsLink) {
    lines.push('');
    lines.push(`View all: ${notificationsLink}`);
    if (approvalsLink) lines.push(`Approvals: ${approvalsLink}`);
    if (sourcesLink) lines.push(`Directory sources: ${sourcesLink}`);
  }

  const text = lines.join('\n');
  const html = `
    <div>
      <p>You have <strong>${total}</strong> unread directory alert${total === 1 ? '' : 's'} from the last day.</p>
      <p>Severity: critical ${severityCounts.critical || 0}, warning ${severityCounts.warning || 0}, info ${severityCounts.info || 0}.</p>
      ${sample.length > 0 ? `<ul>${sample
        .map((item) => `<li>${item.title || item.type || 'Directory alert'}${item.created_at ? ` (${new Date(item.created_at).toLocaleString()})` : ''}</li>`)
        .join('')}</ul>` : '<p>No highlights to share.</p>'}
      ${notificationsLink ? `<p><a href="${notificationsLink}">View all notifications</a></p>` : ''}
      ${approvalsLink ? `<p><a href="${approvalsLink}">Review approvals</a></p>` : ''}
      ${sourcesLink ? `<p><a href="${sourcesLink}">Check directory sources</a></p>` : ''}
    </div>
  `;

  return { subject, text, html };
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const authHeader = String(req.headers['authorization'] ?? '');
  const digestToken = String(process.env.DIGEST_TOKEN ?? '');
  if (!digestToken || authHeader !== `Bearer ${digestToken}`) {
    return res.status(403).json({ ok: false, reason: 'forbidden' });
  }

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false, reason: 'missing_hasura_config' });

  async function hasura(query: string, variables?: Record<string, any>) {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  const now = new Date();
  const baseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);

  const prefsResp = await hasura(
    `query DigestPreferences {
      notification_preferences(where: { email_enabled: { _eq: true }, digest_mode: { _neq: "off" } }) {
        user_id
        email_enabled
        digest_mode
        digest_hour
        timezone
        directory_digest
        invites_digest
        messaging_digest
        quiet_hours_start
        quiet_hours_end
        directory_alerts
      }
    }`
  );

  const prefs = Array.isArray(prefsResp?.data?.notification_preferences)
    ? prefsResp.data.notification_preferences
    : [];

  if (prefs.length === 0) return res.status(200).json({ ok: true, skipped: true, reason: 'no_prefs' });

  const userIds = prefs.map((p: any) => p?.user_id).filter(Boolean);
  const usersResp = await hasura(
    `query DigestUsers($userIds: [uuid!]!) {
      users: auth_users(where: { id: { _in: $userIds } }) {
        id
        email
        display_name
      }
    }`,
    { userIds }
  );

  const users = Array.isArray(usersResp?.data?.users) ? usersResp.data.users : [];
  const userMap = new Map<string, { email?: string | null; display_name?: string | null }>();
  users.forEach((user: any) => userMap.set(String(user.id), { email: user.email, display_name: user.display_name }));

  const results: any[] = [];

  for (const pref of prefs) {
    const digestMode = normalizeDigestMode(pref?.digest_mode);
    const hasQuietHours = pref?.quiet_hours_start !== null && pref?.quiet_hours_end !== null;
    const isDailyDigest = digestMode === 'daily';
    const isQuietHoursDigest = digestMode === 'immediate' && hasQuietHours;

    if (!isDailyDigest && !isQuietHoursDigest) continue;
    if (pref.directory_alerts === false || pref.directory_digest === false) continue;

    const userId = String(pref.user_id);
    const user = userMap.get(userId);
    if (!user?.email) {
      results.push({ userId, skipped: true, reason: 'missing_email' });
      continue;
    }

    const window = computeDigestWindow({ digestHour: pref.digest_hour, timezone: pref.timezone }, now);
    const outbox = await ensureOutbox({ hasura, userId, windowStart: window.windowStartDate, windowEnd: window.windowEndDate });

    if (!outbox?.id) {
      results.push({ userId, skipped: true, reason: 'outbox_unavailable' });
      continue;
    }

    if (outbox.status === 'sent') {
      results.push({ userId, skipped: true, reason: 'already_sent' });
      continue;
    }

    const notificationsResp = await hasura(
      `query DigestNotifications($userId: uuid!, $start: timestamptz!, $end: timestamptz!) {
        notifications(
          where: {
            user_id: { _eq: $userId },
            read_at: { _is_null: true },
            created_at: { _gte: $start, _lt: $end }
          },
          order_by: { created_at: desc }
        ) {
          id
          type
          severity
          title
          body
          created_at
        }
      }`,
      { userId, start: window.start, end: window.end }
    );

    let notifications = Array.isArray(notificationsResp?.data?.notifications)
      ? notificationsResp.data.notifications
      : [];

    notifications = notifications.filter((notif: any) => String(notif.type || '').startsWith('directory.'));

    if (digestMode === 'immediate') {
      notifications = notifications.filter((notif: any) =>
        isWithinQuietHours(new Date(notif.created_at), pref.quiet_hours_start, pref.quiet_hours_end, pref.timezone)
      );
    }

    if (notifications.length === 0) {
      await markOutboxStatus(hasura, { id: outbox.id, status: 'sent', error: null, sentAt: new Date().toISOString() });
      results.push({ userId, sent: false, count: 0, reason: 'no_notifications' });
      continue;
    }

    const emailContent = buildDigestEmail({ notifications, baseUrl });

    try {
      await sendEmail({ to: user.email!, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
      await markOutboxStatus(hasura, { id: outbox.id, status: 'sent', error: null, sentAt: new Date().toISOString() });
      results.push({ userId, sent: true, count: notifications.length });
    } catch (error: any) {
      const message = error?.message ?? 'failed_to_send';
      await markOutboxStatus(hasura, { id: outbox.id, status: 'failed', error: message, sentAt: null });
      results.push({ userId, sent: false, count: notifications.length, error: message });
    }
  }

  return res.status(200).json({ ok: true, processed: results.length, results });
};
