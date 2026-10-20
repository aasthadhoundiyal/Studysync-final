import api from './client';

/**
 * Health check endpoint
 * GET /api/health
 */
export async function checkHealth() {
  return api.get('/health');
}
