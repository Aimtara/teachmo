import { DirectoryContact } from '../directory/types';
import { DirectorySourceSecrets } from './secrets';

type CleverConfig = {
  baseUrl?: string;
  apiVersion?: string;
  mode?: 'district';
  contacts?: { roleFilter?: string };
};

export async function fetchContactsFromClever(params: { sourceId: string; config: CleverConfig; secrets: DirectorySourceSecrets }) {
  const { sourceId, config, secrets } = params;
  const baseUrl = config.baseUrl || 'https://api.clever.com';
  const apiVersion = config.apiVersion || 'v3.0';
  const roleFilter = config.contacts?.roleFilter || 'contact';
  const token = secrets?.[sourceId]?.cleverDistrictAppToken;

  if (!token) throw new Error('missing_clever_token');

  const url = `${baseUrl}/${apiVersion}/users?role=${encodeURIComponent(roleFilter)}`;
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!resp.ok) throw new Error(`clever_fetch_failed_${resp.status}`);

  const data = await resp.json();
  const users = Array.isArray(data?.data)
    ? data.data.map((entry: any) => ({ id: entry?.data?.id ?? entry?.id, ...entry?.data }))
    : [];

  const contacts: DirectoryContact[] = [];
  users.forEach((user: any) => {
    const email = user?.email || user?.credentials?.district_username || user?.username;
    if (!email) return;
    contacts.push({
      email,
      contactType: 'parent_guardian',
      sourceRole: roleFilter,
      externalId: user.id,
      firstName: user?.name?.first,
      lastName: user?.name?.last,
    });
  });

  return { contacts, sourceRef: url };
}
