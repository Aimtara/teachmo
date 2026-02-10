/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import app from './app.js';
import { seedDemoData, seedExecutionBoardData, seedOpsDemoData } from './seed.js';
import { startRetentionPurgeScheduler } from './jobs/retentionPurge.js';
import { startNotificationQueueScheduler } from './jobs/notificationQueue.js';
import { startObservabilitySchedulers } from './jobs/observabilityScheduler.js';
import { startRosterSyncScheduler } from './jobs/rosterSyncScheduler.js';
import { startSisContinuousSyncScheduler } from './jobs/sisContinuousSync.js';
import { createLogger } from './utils/logger.js';
import { runMigrations } from './migrate.js';
import { performStartupCheck } from './utils/envCheck.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const logger = createLogger('server');

// 1. Verify Environment Integrity (Launch Readiness Patch)
performStartupCheck();

const shouldSeedDemo =
  String(process.env.ENABLE_DEMO_SEED || '').toLowerCase() === 'true' &&
  (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';

if (shouldSeedDemo) {
  seedDemoData();
}

await runMigrations();
seedExecutionBoardData();
await seedOpsDemoData();
startRetentionPurgeScheduler();
startNotificationQueueScheduler();
startObservabilitySchedulers();
startRosterSyncScheduler();
startSisContinuousSyncScheduler();

const server = app.listen(PORT, () => {
  logger.info(`Teachmo backend server running on port ${PORT}`);
});

// JWT verification for WebSocket authentication
const jwksUrl = process.env.AUTH_JWKS_URL || process.env.NHOST_JWKS_URL || '';
const issuer = process.env.AUTH_ISSUER || process.env.NHOST_JWT_ISSUER || undefined;
const audience = process.env.AUTH_AUDIENCE || process.env.NHOST_JWT_AUDIENCE || undefined;
const envLower = (process.env.NODE_ENV || 'development').toLowerCase();
const isProd = envLower === 'production';

let jwks = null;
if (jwksUrl) {
  jwks = createRemoteJWKSet(new URL(jwksUrl));
}

const textEncoder = new TextEncoder();

function isMockAuthMode() {
  const mode = String(process.env.AUTH_MODE || '').toLowerCase();
  return mode === 'mock' && String(process.env.NODE_ENV || '').toLowerCase() === 'test';
}

async function verifyWebSocketToken(token) {
  if (!token) return null;

  // Test-only mock verification: HS256 tokens signed with AUTH_MOCK_SECRET.
  if (isMockAuthMode()) {
    const secret = String(process.env.AUTH_MOCK_SECRET || '').trim();
    if (!secret) throw new Error('AUTH_MOCK_SECRET is required when AUTH_MODE=mock');
    const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
      algorithms: ['HS256'],
    });
    return payload;
  }

  if (!jwks) {
    // In production, missing JWKS is a hard failure.
    if (isProd) {
      throw new Error('AUTH_JWKS_URL is required in production to verify JWTs');
    }

    // In non-prod you may opt-in to insecure decode for local testing.
    const allowInsecure = String(process.env.ALLOW_INSECURE_JWT_DECODE || '').toLowerCase() === 'true';
    if (!allowInsecure) return null;

    // Minimal, *insecure* decode (dev-only) — does NOT validate signature.
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  });
  return payload;
}

// Configure WebSocket max payload size to mitigate large-frame DoS
const DEFAULT_WS_MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MiB
const envMaxPayload = process.env.WS_MAX_PAYLOAD_BYTES;
let maxPayloadBytes = DEFAULT_WS_MAX_PAYLOAD_BYTES;

if (envMaxPayload !== undefined) {
  const parsed = Number(envMaxPayload);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      `Invalid WS_MAX_PAYLOAD_BYTES value: "${envMaxPayload}". ` +
      `Expected a positive number of bytes. Falling back to default ${DEFAULT_WS_MAX_PAYLOAD_BYTES} bytes.`,
    );
  } else {
    maxPayloadBytes = parsed;
    logger.info(`WebSocket max payload size set to ${maxPayloadBytes} bytes`);
  }
}

// Configure WebSocket per-message deflate (compression) behind an explicit env flag.
// Disabled by default to reduce CPU usage and mitigate compression-related DoS risk.
const isPerMessageDeflateEnabled =
  String(process.env.WS_PERMESSAGE_DEFLATE_ENABLED || '').toLowerCase() === 'true';

if (isPerMessageDeflateEnabled) {
  logger.info('WebSocket perMessageDeflate compression ENABLED via WS_PERMESSAGE_DEFLATE_ENABLED.');
} else {
  logger.info('WebSocket perMessageDeflate compression DISABLED (default).');
}

// Attach WebSocket Server to the same HTTP server with explicit limits
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: maxPayloadBytes,
  perMessageDeflate: isPerMessageDeflateEnabled
    ? {
        zlibDeflateOptions: {
          // See https://nodejs.org/api/zlib.html#zlib_class_options
          windowBits: 15,
          memLevel: 8,
        },
        zlibInflateOptions: {
          windowBits: 15,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 15,
      }
    : false,
});
// Validate and parse WS_HEARTBEAT_MS with proper error handling
const DEFAULT_HEARTBEAT_MS = 30000;
const envHeartbeat = process.env.WS_HEARTBEAT_MS;
let heartbeatIntervalMs = DEFAULT_HEARTBEAT_MS;

if (envHeartbeat !== undefined) {
  const parsed = Number(envHeartbeat);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      `Invalid WS_HEARTBEAT_MS value: "${envHeartbeat}". ` +
      `Expected a positive number. Falling back to default ${DEFAULT_HEARTBEAT_MS}ms.`
    );
  } else {
    heartbeatIntervalMs = parsed;
    logger.info(`WebSocket heartbeat interval set to ${heartbeatIntervalMs}ms`);
  }
}

const heartbeatIntervalId = setInterval(() => {
  wss.clients.forEach((client) => {
    // Guard against closed/closing sockets before attempting ping/terminate
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    if (client.isAlive === false) {
      try {
        client.terminate();
      } catch (terminateErr) {
        logger.error('Failed to terminate unresponsive WebSocket client during heartbeat', {
          error: terminateErr,
        });
      }
      return;
    }

    client.isAlive = false;
    try {
      client.ping();
    } catch (pingErr) {
      logger.warn('WebSocket ping failed during heartbeat; terminating client', {
        error: pingErr,
      });
      try {
        client.terminate();
      } catch (terminateErr) {
        logger.error('Failed to terminate WebSocket client after ping failure', {
          error: terminateErr,
        });
      }
    }
  });
}, heartbeatIntervalMs);

wss.on('connection', async (ws, req) => {
  // Extract and verify JWT, preferring Authorization header over query parameter
  const url = new URL(req.url, `http://${req.headers.host}`);
  const tokenFromQuery = url.searchParams.get('token');
  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    logger.warn('WebSocket connection rejected: missing authentication token');
    ws.close(1008, 'Authentication required');
    return;
  }

  try {
    const payload = await verifyWebSocketToken(token);
    if (!payload) {
      logger.warn('WebSocket connection rejected: invalid or expired token');
      ws.close(1008, 'Invalid authentication token');
      return;
    }

    // Extract user ID from JWT payload
    const hasuraClaims = payload?.['https://hasura.io/jwt/claims'] || payload?.['https://nhost.io/jwt/claims'] || {};
    const userId = hasuraClaims['x-hasura-user-id'] || payload.sub || payload.user_id;

    if (!userId) {
      logger.warn('WebSocket connection rejected: token missing user ID');
      ws.close(1008, 'Invalid token claims');
      return;
    }

    // Store auth context on the WebSocket instance
    ws.auth = {
      userId,
      payload,
    };

    logger.debug(`WebSocket connection established for user ${userId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('WebSocket connection rejected: token verification failed -', errorMessage);
    ws.close(1008, 'Authentication failed');
    return;
  }

  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    const messageType = typeof message;
    const messageSize = message && typeof message.length === 'number'
      ? message.length
      : (message && typeof message.byteLength === 'number' ? message.byteLength : null);
    logger.debug(
      `Received WebSocket message (type=${messageType}${messageSize !== null ? `, size=${messageSize}` : ''})`,
    );
    // Echo for now (or handle your app logic here)
    // Only attempt to send if the WebSocket is currently OPEN (1 = WebSocket.OPEN in 'ws')
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ type: 'ack', received: true }));
      } catch (sendErr) {
        logger.warn('Failed to send WebSocket ACK in message handler', {
          error: sendErr,
        });
      }
    } else {
      logger.debug?.('Skipping WebSocket ACK send; socket is not OPEN', {
        readyState: ws.readyState,
      });
    }
  });

  ws.on('error', (err) => {
    logger.error('WebSocket error:', err);
  });
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down WebSocket server`);
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
  }
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
