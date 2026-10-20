/**
 * Entry point: connects to MongoDB, then starts the HTTP server.
 */
const env = require('./config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

let server;

async function start() {
  try {
    await connectDB();
    server = app.listen(env.port, () => {
      console.log(`[server] StudySync API running on http://localhost:${env.port} (${env.nodeEnv})`);
      console.log(`[server] Allowed CORS origins: ${env.clientUrls.join(', ')}`);
    });
  } catch (err) {
    console.error(`[server] Failed to start: ${err.message}`);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

start();
