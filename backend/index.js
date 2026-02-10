/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
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
import { verifyJWT, extractToken } from './security/jwt.js';

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
        // Terminate clients that are already marked dead or not in a usable state
        if (
          client.isAlive === false ||
          client.readyState === client.CLOSING ||
          client.readyState === client.CLOSED
        ) {
          try {
            client.terminate();
          } catch (err) {
            logger.error('Failed to terminate WebSocket client during heartbeat', err);
          }
          return;
        }

        // Only attempt to ping sockets that are currently open
        if (client.readyState === client.OPEN) {
          client.isAlive = false;
          try {
            client.ping();
          } catch (err) {
            logger.warn('WebSocket heartbeat ping failed, terminating client', err);
            try {
              client.terminate();
            } catch (terminateErr) {
              logger.error(
                'Failed to terminate WebSocket client after ping failure',
                terminateErr
              );
            }
          }
        }
      });
}, heartbeatIntervalMs);

wss.on('connection', async (ws, req) => {
  // Extract token from Authorization header (preferred) or query parameter
  const token = extractToken(req, { allowQuery: true });

  if (!token) {
    logger.warn('WebSocket connection rejected: missing authentication token');
    ws.close(1008, 'Authentication required');
    return;
  }

  // Verify JWT during the WebSocket handshake
  try {
    const payload = await verifyJWT(token);
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
    logger.warn('WebSocket connection rejected: token verification failed', { error: errorMessage });
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
