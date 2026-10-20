const { getDBStatus } = require('../config/db');
const env = require('../config/env');
const { isGeminiConfigured } = require('../services/gemini.service');

/**
 * GET /api/health
 * Reports API and database status. Returns 503 if the DB is not connected.
 */
function getHealth(req, res) {
  const database = getDBStatus();
  const healthy = database === 'connected';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    service: 'studysync-api',
    environment: env.nodeEnv,
    database,
    ai: {
      configured: isGeminiConfigured(),
      provider: 'gemini',
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
