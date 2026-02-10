/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import app from './app.js';
import { seedDemoData, seedExecutionBoardData, seedOpsDemoData } from './seed.js';
import { startRetentionPurgeScheduler } from './jobs/retentionPurge.js';
import { startNotificationQueueScheduler } from './jobs/notificationQueue.js';
import { startObservabilitySchedulers } from './jobs/observabilityScheduler.js';
import { startRosterSyncScheduler } from './jobs/rosterSyncScheduler.js';
import { createLogger } from './utils/logger.js';
import { runMigrations } from './migrate.js';
import { performStartupCheck } from './utils/envCheck.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const logger = createLogger('server');

// Helper to check if we're in mock auth mode (test environment only)
function isMockAuthMode() {
  const mode = String(process.env.AUTH_MODE || '').toLowerCase();
  return mode === 'mock' && String(process.env.NODE_ENV || '').toLowerCase() === 'test';
}

// Helper to verify WebSocket JWT tokens
const textEncoder = new TextEncoder();
const jwksUrl = process.env.AUTH_JWKS_URL || process.env.NHOST_JWKS_URL || '';
const issuer = process.env.AUTH_ISSUER || process.env.NHOST_JWT_ISSUER || undefined;
const audience = process.env.AUTH_AUDIENCE || process.env.NHOST_JWT_AUDIENCE || undefined;

let jwks = null;
if (jwksUrl) {
  jwks = createRemoteJWKSet(new URL(jwksUrl));
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
    const envLower = (process.env.NODE_ENV || 'development').toLowerCase();
    if (envLower === 'production') {
      throw new Error('AUTH_JWKS_URL is required in production to verify JWTs');
    }
    return null;
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  });
  return payload;
}

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

const server = app.listen(PORT, () => {
  logger.info(`Teachmo backend server running on port ${PORT}`);
});

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

// Add error handler for WebSocketServer to prevent process crashes
wss.on('error', (err) => {
  logger.error('WebSocketServer error:', { error: err });
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
    // Only perform heartbeat on sockets that are currently OPEN
    // 1 corresponds to WebSocket.OPEN in the 'ws' library
    if (client.readyState !== 1) {
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
  // Extract token from query parameter (?token=...) or Authorization header
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryToken = url.searchParams.get('token');
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = queryToken || bearerToken;

  // Verify JWT during the WebSocket handshake
  try {
    const payload = await verifyWebSocketToken(token);
    if (!payload) {
      logger.warn('WebSocket connection rejected: missing or invalid token');
      ws.close(1008, 'Authentication failed'); // Policy Violation close code
      return;
    }
    // Token is valid, store payload for later use if needed
    ws.authPayload = payload;
    logger.debug('New authenticated WebSocket connection established', {
      userId: payload.sub || payload.user_id,
    });
  } catch (err) {
    logger.warn('WebSocket connection rejected: token verification failed', {
      error: err.message,
    });
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
    ws.send(JSON.stringify({ type: 'ack', received: true }));
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

  // Set a timeout to force-terminate clients if graceful close takes too long
  const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds
  const FINAL_EXIT_TIMEOUT_MS = 2000; // 2 seconds after forced server close
  let finalExitTimer = null;
  
  const forceShutdownTimer = setTimeout(() => {
    logger.warn('Shutdown timeout reached, force-terminating remaining WebSocket clients');
    wss.clients.forEach((client) => {
      try {
        client.terminate();
      } catch (err) {
        logger.error('Error force-terminating WebSocket client', { error: err });
      }
    });
    // Force close the HTTP server and exit
    server.close(() => {
      process.exit(0);
    });
    // If server.close doesn't complete, force exit after another 2 seconds
    finalExitTimer = setTimeout(() => {
      logger.error('Forced process exit after shutdown timeout');
      process.exit(1);
    }, FINAL_EXIT_TIMEOUT_MS);
  }, SHUTDOWN_TIMEOUT_MS);

  wss.close(() => {
    clearTimeout(forceShutdownTimer);
    if (finalExitTimer) {
      clearTimeout(finalExitTimer);
    }
    server.close(() => {
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
