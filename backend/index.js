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

// Attach WebSocket Server to the same HTTP server with explicit limits
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: maxPayloadBytes,
  perMessageDeflate: {
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
  },
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
        if (client.isAlive === false) {
          client.terminate();
          return;
        }

        client.isAlive = false;
        client.ping();
      });
    }, heartbeatIntervalMs);

wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    const messageType = typeof message;
    const messageSize = message && typeof message.length === 'number'
      ? message.length
      : (message && typeof message.byteLength === 'number' ? message.byteLength : null);
    logger.info(
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
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
