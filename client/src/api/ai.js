import api from './client';

/**
 * AI Features API module (StudySync Gemini AI Service)
 */

/**
 * Get AI Quiz generated from a post
 * GET /api/posts/:id/quiz
 * Params: { force: boolean }
 */
export async function getQuiz(postId, force = false) {
  return api.get(`/posts/${postId}/quiz`, force ? { force: 'true' } : {});
}

/**
 * Clear cached quiz
 * DELETE /api/posts/:id/quiz
 */
export async function clearQuizCache(postId) {
  return api.delete(`/posts/${postId}/quiz`);
}

/**
 * Get AI Summary of a post
 * GET /api/posts/:id/summary
 * Params: { force: boolean }
 */
export async function getSummary(postId, force = false) {
  return api.get(`/posts/${postId}/summary`, force ? { force: 'true' } : {});
}

/**
 * Clear cached summary
 * DELETE /api/posts/:id/summary
 */
export async function clearSummaryCache(postId) {
  return api.delete(`/posts/${postId}/summary`);
}

/**
 * Extract AI Keywords and Topics from a post
 * GET /api/posts/:id/keywords
 * Params: { force: boolean }
 */
export async function getKeywords(postId, force = false) {
  return api.get(`/posts/${postId}/keywords`, force ? { force: 'true' } : {});
}

/**
 * Clear cached keywords
 * DELETE /api/posts/:id/keywords
 */
export async function clearKeywordsCache(postId) {
  return api.delete(`/posts/${postId}/keywords`);
}
