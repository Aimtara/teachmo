/* eslint-env node */
import { createId, integrationStore, nowIso } from './store.js';

export function listConnections() {
  return integrationStore.connections;
}

export function createConnection({ name, type = 'sis', provider, auth = {} } = {}) {
  const timestamp = nowIso();
  const connection = {
    id: createId('conn'),
    name: name || `${provider || 'integration'} connection`,
    type,
    provider,
    auth: {
      clientId: auth.clientId || '',
      clientSecret: auth.clientSecret || '',
      authUrl: auth.authUrl || '',
      tokenUrl: auth.tokenUrl || '',
      scopes: auth.scopes || [],
    },
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  integrationStore.connections.push(connection);
  return connection;
}

export function findConnection(connectionId) {
  return integrationStore.connections.find((item) => item.id === connectionId);
}

export function saveToken(connectionId, tokenPayload = {}) {
  const connection = findConnection(connectionId);
  if (!connection) throw new Error('Integration connection not found');

  const issuedAt = nowIso();
  const expiresIn = Number(tokenPayload.expires_in || tokenPayload.expiresIn || 0);
  const expiresAt = tokenPayload.expires_at
    ? new Date(tokenPayload.expires_at).toISOString()
    : expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const tokenRecord = {
    id: createId('token'),
    connectionId,
    accessToken: tokenPayload.access_token || tokenPayload.accessToken || createId('access'),
    refreshToken: tokenPayload.refresh_token || tokenPayload.refreshToken || null,
    scope: tokenPayload.scope || tokenPayload.scopes || [],
    tokenType: tokenPayload.token_type || tokenPayload.tokenType || 'Bearer',
    issuedAt,
    expiresAt,
  };

  integrationStore.tokens = integrationStore.tokens.filter((item) => item.connectionId !== connectionId);
  integrationStore.tokens.push(tokenRecord);
  connection.status = 'active';
  connection.updatedAt = nowIso();

  return tokenRecord;
}

export function getToken(connectionId) {
  return integrationStore.tokens.find((token) => token.connectionId === connectionId);
}

export function isTokenExpired(token) {
  if (!token?.expiresAt) return false;
  return new Date(token.expiresAt).getTime() <= Date.now();
}

export function refreshToken(connectionId) {
  const token = getToken(connectionId);
  if (!token) throw new Error('OAuth token not found');
  if (!token.refreshToken) throw new Error('Refresh token missing');

  const refreshed = {
    ...token,
    accessToken: createId('access'),
    issuedAt: nowIso(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  integrationStore.tokens = integrationStore.tokens.filter((item) => item.connectionId !== connectionId);
  integrationStore.tokens.push(refreshed);
  return refreshed;
}

export function getMaskedToken(connectionId) {
  const token = getToken(connectionId);
  if (!token) return null;
  const maskedAccessToken = token.accessToken ? `${token.accessToken.slice(0, 6)}…` : null;
  return {
    ...token,
    accessToken: maskedAccessToken,
    refreshToken: token.refreshToken ? 'stored' : null,
  };
}

export function ensureValidToken(connectionId) {
  const token = getToken(connectionId);
  if (!token) throw new Error('OAuth token not found');
  if (!isTokenExpired(token)) return token;
  return refreshToken(connectionId);
}
