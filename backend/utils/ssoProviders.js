/* eslint-env node */
import { query } from '../db.js';

function normalizeProvider(provider) {
  return String(provider || '').trim().toLowerCase();
}

function domainFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const [, domain] = email.toLowerCase().split('@');
  return domain || null;
}

export async function resolveOrganizationId({ organizationId, email }) {
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
  return result.rows?.[0]?.organization_id ?? null;
}

export async function loadSsoSettings({ provider, organizationId }) {
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

  const row = result.rows?.[0];
  if (!row || !row.is_enabled) return null;
  return {
    id: row.id,
    provider: normalized,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    issuer: row.issuer,
    metadata: row.metadata || {},
  };
}

export function buildSamlConfig({ settings, baseUrl }) {
  const metadata = settings.metadata || {};
  const entryPoint = metadata.entryPoint || metadata.entrypoint;
  const cert = metadata.cert || metadata.certificate || metadata.idpCert;
  if (!entryPoint || !cert) {
    throw new Error('Missing SAML entryPoint or cert in metadata');
  }

  return {
    entryPoint,
    cert,
    issuer: metadata.issuer || settings.issuer || baseUrl,
    callbackUrl: metadata.callbackUrl || `${baseUrl}/api/sso/${settings.provider}/callback`,
    identifierFormat: metadata.identifierFormat || null,
    signatureAlgorithm: metadata.signatureAlgorithm || 'sha256',
    wantAssertionsSigned: metadata.wantAssertionsSigned ?? true,
    wantAuthnResponseSigned: metadata.wantAuthnResponseSigned ?? false,
    audience: metadata.audience || undefined,
    decryptionPvk: metadata.decryptionPvk || undefined,
    passReqToCallback: true,
  };
}

export function buildOidcConfig({ settings, baseUrl }) {
  const metadata = settings.metadata || {};
  const authorizationURL = metadata.authorizationURL || metadata.authorizationUrl;
  const tokenURL = metadata.tokenURL || metadata.tokenUrl;
  const userInfoURL = metadata.userInfoURL || metadata.userInfoUrl;
  const callbackURL = metadata.callbackUrl || `${baseUrl}/api/sso/${settings.provider}/callback`;

  if (!authorizationURL || !tokenURL || !userInfoURL) {
    throw new Error('Missing OIDC authorizationURL/tokenURL/userInfoURL metadata');
  }

  return {
    issuer: settings.issuer || metadata.issuer,
    authorizationURL,
    tokenURL,
    userInfoURL,
    clientID: settings.clientId,
    clientSecret: settings.clientSecret,
    callbackURL,
    scope: metadata.scope || metadata.scopes || 'openid email profile',
    passReqToCallback: true,
  };
}
