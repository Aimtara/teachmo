import { query } from '../db.js';

type SsoSettingsRow = {
  id: string;
  provider: string;
  client_id: string;
  client_secret: string;
  issuer: string;
  metadata: Record<string, unknown> | null;
  is_enabled: boolean;
};

type SsoSettings = {
  id: string;
  provider: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  metadata: Record<string, unknown>;
};

function normalizeProvider(provider: unknown): string {
  return String(provider || '').trim().toLowerCase();
}

function domainFromEmail(email: unknown): string | null {
  if (!email || typeof email !== 'string') return null;
  const [, domain] = email.toLowerCase().split('@');
  return domain || null;
}

export async function resolveOrganizationId({
  organizationId,
  email
}: {
  organizationId?: string | null;
  email?: string | null;
}): Promise<string | null> {
  if (organizationId) return organizationId;
  const domain = domainFromEmail(email);
  if (!domain) return null;

  const result = await query(
    `select organization_id
     from public.tenant_domains
     where domain = $1
     order by is_primary desc, verified_at desc nulls last
     limit 1`,
    [domain]
  );
  return (result.rows?.[0]?.organization_id as string | undefined) ?? null;
}

export async function loadSsoSettings({
  provider,
  organizationId
}: {
  provider: string;
  organizationId: string | null;
}): Promise<SsoSettings | null> {
  const normalized = normalizeProvider(provider);
  if (!normalized || !organizationId) return null;

  const result = await query(
    `select id, provider, client_id, client_secret, issuer, metadata, is_enabled
     from public.enterprise_sso_settings
     where organization_id = $1
       and provider = $2
     limit 1`,
    [organizationId, normalized]
  );

  const row = result.rows?.[0] as SsoSettingsRow | undefined;
  if (!row || !row.is_enabled) return null;
  return {
    id: row.id,
    provider: normalized,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    issuer: row.issuer,
    metadata: row.metadata || {}
  };
}

export function buildSamlConfig({ settings, baseUrl }: { settings: SsoSettings; baseUrl: string }) {
  const metadata = settings.metadata || {};
  const entryPoint = (metadata.entryPoint ?? metadata.entrypoint) as string | undefined;
  const cert = (metadata.cert ?? metadata.certificate ?? metadata.idpCert) as string | undefined;
  if (!entryPoint || !cert) {
    throw new Error('Missing SAML entryPoint or cert in metadata');
  }

  return {
    entryPoint,
    cert,
    issuer: (metadata.issuer as string | undefined) || settings.issuer || baseUrl,
    callbackUrl: (metadata.callbackUrl as string | undefined) || `${baseUrl}/api/sso/${settings.provider}/callback`,
    identifierFormat: (metadata.identifierFormat as string | undefined) || null,
    signatureAlgorithm: (metadata.signatureAlgorithm as string | undefined) || 'sha256',
    wantAssertionsSigned: (metadata.wantAssertionsSigned as boolean | undefined) ?? true,
    wantAuthnResponseSigned: (metadata.wantAuthnResponseSigned as boolean | undefined) ?? false,
    audience: (metadata.audience as string | undefined) || undefined,
    decryptionPvk: (metadata.decryptionPvk as string | undefined) || undefined,
    passReqToCallback: true
  };
}

export function buildOidcConfig({ settings, baseUrl }: { settings: SsoSettings; baseUrl: string }) {
  const metadata = settings.metadata || {};
  const authorizationURL = (metadata.authorizationURL ?? metadata.authorizationUrl) as string | undefined;
  const tokenURL = (metadata.tokenURL ?? metadata.tokenUrl) as string | undefined;
  const userInfoURL = (metadata.userInfoURL ?? metadata.userInfoUrl) as string | undefined;
  const callbackURL = (metadata.callbackUrl as string | undefined) || `${baseUrl}/api/sso/${settings.provider}/callback`;

  if (!authorizationURL || !tokenURL || !userInfoURL) {
    throw new Error('Missing OIDC authorizationURL/tokenURL/userInfoURL metadata');
  }

  return {
    issuer: settings.issuer || (metadata.issuer as string | undefined),
    authorizationURL,
    tokenURL,
    userInfoURL,
    clientID: settings.clientId,
    clientSecret: settings.clientSecret,
    callbackURL,
    scope: (metadata.scope as string | undefined) || (metadata.scopes as string | undefined) || 'openid email profile',
    passReqToCallback: true
  };
}
