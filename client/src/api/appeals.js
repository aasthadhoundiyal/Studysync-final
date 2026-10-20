import api from './client';

/**
 * Submit an appeal for blocked/removed content
 * POST /api/appeals
 * Body: { contentType: "post"|"comment", contentId, reason }
 */
export async function submitAppeal(appealData) {
  return api.post('/appeals', appealData);
}

/**
 * Get current user's submitted appeals
 * GET /api/appeals/me
 */
export async function getMyAppeals(params = {}) {
  return api.get('/appeals/me', params);
}

