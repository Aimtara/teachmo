/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import http from 'http';
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

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const heartbeatIntervalMs = Number(process.env.WS_HEARTBEAT_MS ?? 30000);
const isHeartbeatEnabled = Number.isFinite(heartbeatIntervalMs) && heartbeatIntervalMs > 0;

const heartbeatIntervalId = isHeartbeatEnabled
  ? setInterval(() => {
      wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          client.terminate();
          return;
        }

        client.isAlive = false;
        client.ping();
      });
    }, heartbeatIntervalMs)
  : null;

server.on('upgrade', (req, socket, head) => {
  logger.info(`UPGRADE ${req.url}`);
  const { url } = req;
  if (!url || !url.startsWith('/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  logger.info(`New WebSocket connection established (${req?.socket?.remoteAddress || 'unknown'})`);
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

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Teachmo backend server running on port ${PORT}`);
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
