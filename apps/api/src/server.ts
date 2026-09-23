import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { initSocketServer, closeSocketServer } from './realtime/socketServer.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO on the unified HTTP server
initSocketServer(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[GATIMAAN API] Server running on 0.0.0.0:${config.port} (${config.nodeEnv})`);
  console.log(`[GATIMAAN API] Health check available at http://localhost:${config.port}/health`);
});

// Graceful shutdown handling
async function handleShutdown(signal: string) {
  console.log(`\n[GATIMAAN API] Received ${signal}. Starting graceful shutdown...`);

  try {
    await closeSocketServer();
  } catch (err) {
    console.error('[GATIMAAN API] Error closing Socket.IO server:', err);
  }

  server.close((err) => {
    if (err) {
      console.error('[GATIMAAN API] Error closing HTTP server:', err);
      process.exit(1);
    }
    console.log('[GATIMAAN API] HTTP and Realtime server closed gracefully.');
    process.exit(0);
  });

  // Force close after timeout if graceful shutdown hangs
  setTimeout(() => {
    console.error('[GATIMAAN API] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { server };
