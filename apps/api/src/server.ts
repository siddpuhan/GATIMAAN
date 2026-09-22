import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[GATIMAAN API] Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[GATIMAAN API] Health check available at http://0.0.0.0:${config.port}/health`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`\n[GATIMAAN API] Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error('[GATIMAAN API] Error closing server:', err);
      process.exit(1);
    }
    console.log('[GATIMAAN API] HTTP server closed gracefully.');
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
