import { sendEmail } from './email';
import { HasuraClient } from './directoryImportCore';
import { DirectorySource } from './directorySourceSync';

type NotificationPreference = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  directoryAlerts: boolean;
  digestMode: string;
};

type NotificationRecipient = {
  userId: string;
  email?: string;
  displayName?: string;
  preferences: NotificationPreference;
};

type DirectorySyncIssueInput = {
  hasura: HasuraClient;
  schoolId: string;
  districtId?: string | null;
  type: 'directory.sync_failed' | 'directory.needs_review';
  severity: 'warning' | 'critical';
  title: string;
  body: string;
  entityType?: 'directory_source' | 'directory_import_preview' | 'directory_import_job';
  entityId?: string | null;
  dedupeKey?: string | null;
  metadata?: Record<string, any>;
};

type DirectorySyncResult = {
  status?: string;
  runId?: string | null;
  jobId?: string | null;
  previewId?: string | null;
  stats?: Record<string, any>;
  errors?: Array<Record<string, any>>;
};

function parseBool(value: any): boolean {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function normalizeBaseUrl(value?: string | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function sanitizeMetadata(metadata: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {};
  Object.entries(metadata).forEach(([key, val]) => {
    if (val === undefined) return;
    if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        item && typeof item === 'object' ? sanitizeMetadata(item as Record<string, any>) : item
      );
    } else if (val && typeof val === 'object') {
      result[key] = sanitizeMetadata(val as Record<string, any>);
    } else {
      result[key] = val;
    }
  });
  return result;
}

async function loadRecipients(params: { hasura: HasuraClient; schoolId: string; districtId?: string | null }) {
  const { hasura, schoolId, districtId = null } = params;

  const scopeFilters: any[] = [{ role: { _eq: 'admin' } }, { role: { _eq: 'system_admin' } }];
  if (schoolId) {
    scopeFilters.push({ _and: [{ role: { _eq: 'school_admin' } }, { school_id: { _eq: schoolId } }] });
  }
  if (districtId) {
    scopeFilters.push({ _and: [{ role: { _eq: 'district_admin' } }, { district_id: { _eq: districtId } }] });
  }

  const where = {
    _and: [{ role: { _in: ['admin', 'district_admin', 'school_admin', 'system_admin'] } }, { _or: scopeFilters }],
  };

  const profilesResp = await hasura(
    `query Recipients($where: user_profiles_bool_exp!) {
      user_profiles(where: $where) {
        user_id
        role
        school_id
        district_id
      }
    }`,
    { where }
  );

  const profiles = Array.isArray(profilesResp?.data?.user_profiles) ? profilesResp.data.user_profiles : [];
  const userIds = [...new Set(profiles.map((profile: any) => profile?.user_id).filter(Boolean))];
  if (userIds.length === 0) return [] as NotificationRecipient[];

  const detailsResp = await hasura(
    `query UserDetails($userIds: [uuid!]!) {
      users: auth_users(where: { id: { _in: $userIds } }) {
        id
        display_name
        email
      }
      prefs: notification_preferences(where: { user_id: { _in: $userIds } }) {
        user_id
        email_enabled
        in_app_enabled
        directory_alerts
        digest_mode
      }
    }`,
    { userIds }
  );

  const prefsList = Array.isArray(detailsResp?.data?.prefs) ? detailsResp.data.prefs : [];
  const prefMap = new Map<string, NotificationPreference>();
  prefsList.forEach((pref: any) => {
    prefMap.set(String(pref.user_id), {
      emailEnabled: pref.email_enabled !== false,
      inAppEnabled: pref.in_app_enabled !== false,
      directoryAlerts: pref.directory_alerts !== false,
      digestMode: String(pref.digest_mode ?? 'immediate'),
    });
  });

  const missingPrefs = userIds.filter((id) => !prefMap.has(id));
  if (missingPrefs.length > 0) {
    await hasura(
      `mutation InsertPrefs($objects: [notification_preferences_insert_input!]!) {
        insert_notification_preferences(
          objects: $objects,
          on_conflict: { constraint: notification_preferences_pkey, update_columns: [] }
        ) { affected_rows }
      }`,
      {
        objects: missingPrefs.map((id) => ({ user_id: id })),
      }
    );
    missingPrefs.forEach((id) => {
      prefMap.set(id, {
        emailEnabled: true,
        inAppEnabled: true,
        directoryAlerts: true,
        digestMode: 'immediate',
      });
    });
  }

  const users = Array.isArray(detailsResp?.data?.users) ? detailsResp.data.users : [];
  const userMap = new Map<string, { email?: string; display_name?: string }>();
  users.forEach((u: any) => userMap.set(String(u.id), { email: u.email, display_name: u.display_name }));

  return userIds.map((userId) => {
    const user = userMap.get(userId) ?? {};
    const prefs = prefMap.get(userId) ?? {
      emailEnabled: true,
      inAppEnabled: true,
      directoryAlerts: true,
      digestMode: 'immediate',
    };

    return {
      userId,
      email: user.email,
      displayName: user.display_name,
      preferences: prefs,
    };
  });
}

export async function notifyDirectoryIssue(input: DirectorySyncIssueInput) {
  const {
    hasura,
    schoolId,
    districtId = null,
    type,
    severity,
    title,
    body,
    entityType = null,
    entityId = null,
    dedupeKey = null,
    metadata = {},
  } = input;

  const now = new Date();
  const nowIso = now.toISOString();
  const dedupeMinutes = Number(process.env.ALERT_DEDUPE_MINUTES ?? 180);
  const dedupeUntil =
    dedupeKey && Number.isFinite(dedupeMinutes) ? new Date(now.getTime() + dedupeMinutes * 60 * 1000).toISOString() : null;

  const normalizedDedupeKey = dedupeKey?.trim() || null;

  if (normalizedDedupeKey) {
    const dedupeResp = await hasura(
      `query ExistingNotification($dedupeKey: String!, $now: timestamptz!) {
        notifications(where: { dedupe_key: { _eq: $dedupeKey }, dedupe_until: { _gt: $now } }, limit: 1) {
          id
        }
      }`,
      { dedupeKey: normalizedDedupeKey, now: nowIso }
    );

    const existing = Array.isArray(dedupeResp?.data?.notifications) ? dedupeResp.data.notifications : [];
    if (existing.length > 0) {
      return { ok: true, skipped: true, reason: 'deduped' };
    }
  }

  const recipients = await loadRecipients({ hasura, schoolId, districtId });
  if (recipients.length === 0) {
    return { ok: true, skipped: true, reason: 'no_recipients' };
  }

  const sanitizedMetadata = sanitizeMetadata(metadata);
  const notificationObjects = recipients
    .filter((recipient) => recipient.preferences.inAppEnabled && recipient.preferences.directoryAlerts)
    .map((recipient) => ({
      user_id: recipient.userId,
      type,
      severity,
      title,
      body,
      entity_type: entityType,
      entity_id: entityId,
      dedupe_key: normalizedDedupeKey,
      dedupe_until: dedupeUntil,
      metadata: sanitizedMetadata,
    }));

  let inserted = 0;
  if (notificationObjects.length > 0) {
    const insertResp = await hasura(
      `mutation InsertNotifications($objects: [notifications_insert_input!]!) {
        insert_notifications(objects: $objects) { affected_rows }
      }`,
      { objects: notificationObjects }
    );
    inserted = Number(insertResp?.data?.insert_notifications?.affected_rows ?? 0);
  }

  let emailed = 0;
  if (parseBool(process.env.ALERT_EMAIL_ENABLED ?? 'false')) {
    const links = sanitizedMetadata?.links;
    const renderedLinks =
      links && typeof links === 'object'
        ? Object.values(links)
            .filter((value) => typeof value === 'string' && value)
            .map((value) => String(value))
        : [];

    const emailBody = [body, ...renderedLinks.map((link) => `View details: ${link}`)].join('\n\n');

    for (const recipient of recipients) {
      const prefs = recipient.preferences;
      if (!prefs.directoryAlerts || !prefs.emailEnabled || prefs.digestMode === 'off') continue;
      if (!recipient.email) continue;

      try {
        await sendEmail({
          to: recipient.email,
          subject: title,
          html: `<p>${body}</p>${renderedLinks.map((link) => `<p><a href="${link}">${link}</a></p>`).join('')}`,
          text: emailBody,
        });
        emailed += 1;
      } catch (error: any) {
        console.error('Failed to send alert email', error);
      }
    }
  }

  return { ok: true, inserted, emailed, skipped: false };
}

export async function handleDirectorySyncAlert(params: {
  hasura: HasuraClient;
  source: DirectorySource;
  result?: DirectorySyncResult | null;
  error?: any;
  isCron: boolean;
}) {
  const { hasura, source, result = null, error, isCron } = params;
  if (!isCron) return;

  const baseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);
  const links: Record<string, string | null> = {
    source: baseUrl ? `${baseUrl}/admin/directory-sources?sourceId=${source.id}` : null,
  };

  if (result?.previewId && baseUrl) {
    links.preview = `${baseUrl}/admin/directory-import/preview/${result.previewId}`;
  }

  const failureMetadata = {
    sourceId: source.id,
    runId: result?.runId ?? null,
    jobId: result?.jobId ?? null,
    previewId: result?.previewId ?? null,
    errors: result?.errors ?? [],
    links,
  };

  if (error) {
    const message = error?.message ?? 'The scheduled directory sync failed to complete.';
    await notifyDirectoryIssue({
      hasura,
      schoolId: source.school_id,
      districtId: source.district_id ?? null,
      type: 'directory.sync_failed',
      severity: 'critical',
      title: `Directory sync failed for ${source.name}`,
      body: message,
      entityType: 'directory_source',
      entityId: source.id,
      dedupeKey: `directory:${source.id}:sync_failed`,
      metadata: failureMetadata,
    });
    return;
  }

  if (!result) return;

  const thresholdError = (result.errors ?? []).find((err) => err?.reason === 'deactivation_threshold_exceeded');
  if (thresholdError) {
    const deactivateCount = thresholdError.deactivateCount ?? thresholdError.deactivated ?? 0;
    const currentActive = thresholdError.currentActive ?? 0;
    const pctLimit = thresholdError.pctLimit;
    const absLimit = thresholdError.absLimit;

    await notifyDirectoryIssue({
      hasura,
      schoolId: source.school_id,
      districtId: source.district_id ?? null,
      type: 'directory.needs_review',
      severity: 'warning',
      title: `Directory sync needs review for ${source.name}`,
      body:
        `Deactivating ${deactivateCount} of ${currentActive || 'the current'} contacts exceeds the review threshold.` +
        (links.preview ? ' Review the preview before applying changes.' : ''),
      entityType: 'directory_import_preview',
      entityId: result.previewId ?? null,
      dedupeKey: `directory:${source.id}:needs_review`,
      metadata: {
        ...failureMetadata,
        limits: { pctLimit, absLimit },
      },
    });
    return;
  }

  if (result.status === 'failed') {
    const message = (result.errors ?? [])[0]?.message ?? 'The scheduled directory sync did not complete.';
    await notifyDirectoryIssue({
      hasura,
      schoolId: source.school_id,
      districtId: source.district_id ?? null,
      type: 'directory.sync_failed',
      severity: 'critical',
      title: `Directory sync failed for ${source.name}`,
      body: message,
      entityType: result.jobId ? 'directory_import_job' : 'directory_source',
      entityId: (result.jobId ?? source.id) as string,
      dedupeKey: `directory:${source.id}:sync_failed`,
      metadata: failureMetadata,
    });
  }
}
