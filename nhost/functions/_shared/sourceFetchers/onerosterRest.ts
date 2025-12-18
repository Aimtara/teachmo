import { getClientCredentialsToken } from '../auth/oauth2';
import { mapRoleToContactType } from '../directory/computePreview';
import { DirectoryContact, HasuraClient } from '../directory/types';
import { DirectorySourceSecrets } from './secrets';

function resolveField(user: any, path: string) {
  const parts = path.split('.').filter(Boolean);
  let current = user;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function pickEmail(user: any, emailFields: string[]) {
  for (const field of emailFields) {
    const value = resolveField(user, field);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function extractRoles(user: any, paths: string[]) {
  const roles = new Set<string>();
  paths.forEach((path) => {
    const value = resolveField(user, path);
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === 'object' && typeof item.role === 'string') roles.add(item.role);
        else if (typeof item === 'string') roles.add(item);
      });
      return;
    }
    if (typeof value === 'object' && typeof (value as any).role === 'string') {
      roles.add((value as any).role);
      return;
    }
    if (typeof value === 'string') roles.add(value);
  });
  return Array.from(roles);
}

export async function fetchContactsFromOneRosterRest(params: {
  hasura: HasuraClient;
  sourceId: string;
  config: any;
  secrets: DirectorySourceSecrets;
}) {
  const { hasura, sourceId, config, secrets } = params;
  const baseUrl = String(config?.baseUrl ?? '').replace(/\/$/, '');
  const apiRoot = config?.apiRoot ? String(config.apiRoot) : '/ims/oneroster/v1p1';
  const auth = config?.auth || {};

  if (!baseUrl) throw new Error('missing_base_url');

  let authHeader: string | null = null;
  if (auth?.mode === 'oauth_client_credentials') {
    const secretBucket = secrets?.[sourceId] ?? {};
    const clientId = secretBucket.onerosterClientId || secretBucket.classlinkClientId;
    const clientSecret = secretBucket.onerosterClientSecret || secretBucket.classlinkClientSecret;
    const tokenUrl = auth.tokenUrl || secretBucket.classlinkTokenUrl;
    if (!clientId || !clientSecret || !tokenUrl) throw new Error('missing_oauth_credentials');
    authHeader = await getClientCredentialsToken({ hasura, sourceId, tokenUrl, clientId, clientSecret, scope: auth.scope });
  }

  const extract = config?.extract || {};
  const contactRoles: string[] = Array.isArray(extract.contactRoles)
    ? extract.contactRoles
    : ['contact', 'guardian', 'parent', 'teacher', 'staff'];
  const emailFields: string[] = Array.isArray(extract.emailFields)
    ? extract.emailFields
    : ['email', 'emailAddress', 'username'];
  const roleFieldPaths: string[] = Array.isArray(extract.roleFieldPaths) ? extract.roleFieldPaths : ['role', 'roles'];

  const contacts: DirectoryContact[] = [];
  let offset = 0;
  const limit = Number(config?.pagination?.limit ?? 100);
  const usePagination = !config?.pagination || config?.pagination?.enabled !== false;

  while (true) {
    const search = usePagination ? `?limit=${limit}&offset=${offset}` : '';
    const url = `${baseUrl}${apiRoot}/users${search}`;
    const resp = await fetch(url, {
      headers: authHeader ? { authorization: authHeader } : undefined,
    });

    if (!resp.ok) {
      throw new Error(`oneroster_fetch_failed_${resp.status}`);
    }

    const data = await resp.json();
    const users = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
    if (!users.length) break;

    users.forEach((user: any) => {
      const roles = extractRoles(user, roleFieldPaths);
      const matchingRole = roles.find((role) => contactRoles.includes(String(role || '').toLowerCase()));
      if (!matchingRole) return;
      const email = pickEmail(user, emailFields);
      if (!email) return;
      const contactType = mapRoleToContactType(matchingRole);
      contacts.push({
        email,
        contactType,
        sourceRole: matchingRole,
        externalId: user?.sourcedId ?? user?.sourced_id ?? user?.id,
        firstName: user?.givenName ?? user?.firstName,
        lastName: user?.familyName ?? user?.lastName,
      });
    });

    if (!usePagination || users.length < limit) break;
    offset += limit;
  }

  return { contacts, sourceRef: `${baseUrl}${apiRoot}/users` };
}
