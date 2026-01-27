import { DirectoryContact } from '../directory/types';
import { DirectorySourceSecrets } from './secrets';

type CleverEvent = {
  id: string;
  type: string;
  created: string;
  data?: any;
  links?: { next?: string };
};

type CleverEventFetchResult = {
  upserts: DirectoryContact[];
  deactivations: Array<{ email: string; contactType?: string }>;
  lastEventId: string | null;
  lastEventCreated: string | null;
  seededCursor?: boolean;
};

async function fetchJson(url: string, token: string) {
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`clever_events_${resp.status}`);
  return resp.json();
}

function mapCleverUser(user: any, roleFilter: string): DirectoryContact | null {
  const email = user?.email || user?.credentials?.district_username || user?.username;
  if (!email) return null;
  return {
    email,
    contactType: 'parent_guardian',
    sourceRole: roleFilter,
    externalId: user?.id,
    firstName: user?.name?.first,
    lastName: user?.name?.last,
  };
}

function hasContactRole(roles: any[], roleFilter: string) {
  if (!Array.isArray(roles)) return false;
  return roles.map((val) => String(val || '').toLowerCase()).includes(roleFilter.toLowerCase());
}

export async function fetchCleverEvents(params: {
  sourceId: string;
  config: { baseUrl?: string; apiVersion?: string; contacts?: { roleFilter?: string } };
  secrets: DirectorySourceSecrets;
  cursorId?: string | null;
}): Promise<CleverEventFetchResult> {
  const { sourceId, config, secrets, cursorId } = params;
  const baseUrl = config.baseUrl || 'https://api.clever.com';
  const apiVersion = config.apiVersion || 'v3.0';
  const roleFilter = config.contacts?.roleFilter || 'contact';
  const token = secrets?.[sourceId]?.cleverDistrictAppToken;
  if (!token) throw new Error('missing_clever_token');

  if (!cursorId) {
    const seedResp = await fetchJson(`${baseUrl}/${apiVersion}/events?ending_before=last&limit=1`, token);
    const latest = Array.isArray(seedResp?.data) ? seedResp.data[0] : null;
    return {
      upserts: [],
      deactivations: [],
      lastEventId: latest?.data?.id ?? latest?.id ?? null,
      lastEventCreated: latest?.data?.created ?? latest?.created ?? null,
      seededCursor: true,
    };
  }

  let nextUrl: string | null = `${baseUrl}/${apiVersion}/events?starting_after=${cursorId}&limit=100&record_type=users`;
  const upserts: DirectoryContact[] = [];
  const deactivations: Array<{ email: string; contactType?: string }> = [];
  let lastEventId: string | null = cursorId;
  let lastEventCreated: string | null = null;

  while (nextUrl) {
    const payload = await fetchJson(nextUrl, token);
    const events: CleverEvent[] = Array.isArray(payload?.data)
      ? payload.data.map((entry: any) => ({ ...entry?.data, id: entry?.data?.id ?? entry?.id }))
      : [];

    events.forEach((event) => {
      lastEventId = event.id || lastEventId;
      lastEventCreated = event.created || lastEventCreated;
      const user = event?.data?.data ?? event?.data ?? {};
      if (!hasContactRole(user?.roles || [], roleFilter)) return;

      if (event.type === 'users.created' || event.type === 'users.updated') {
        const contact = mapCleverUser(user, roleFilter);
        if (contact) upserts.push(contact);
      } else if (event.type === 'users.deleted') {
        const contact = mapCleverUser(user, roleFilter);
        if (contact?.email) deactivations.push({ email: contact.email, contactType: contact.contactType });
      }
    });

    const nextLink = payload?.links?.next;
    nextUrl = nextLink ? `${baseUrl}${nextLink}` : null;
  }

  return { upserts, deactivations, lastEventId, lastEventCreated };
}
