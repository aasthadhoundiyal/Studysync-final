import api, { request } from './client';

/**
 * Get posts feed
 * GET /api/posts
 * Params: { sort: 'newest'|'oldest'|'trending', tag, q, page, limit }
 */
export async function getFeed(params = {}) {
  return api.get('/posts', params);
}

/**
 * Get single post details
 * GET /api/posts/:id
 */
export async function getPost(id) {
  return api.get(`/posts/${id}`);
}

/**
 * Create a new post
 * POST /api/posts
 * Supports both JSON { title, content, tags } or FormData with attachments[]
 */
export async function createPost(postData) {
  if (postData instanceof FormData) {
    return request('/posts', {
      method: 'POST',
      body: postData,
      isFormData: true,
    });
  }
  return api.post('/posts', postData);
}

/**
 * Delete a post (author or admin)
 * DELETE /api/posts/:id
 */
export async function deletePost(id) {
  return api.delete(`/posts/${id}`);
}

/**
 * Get like status for a post
 * GET /api/posts/:id/like
 */
export async function getLikeStatus(id) {
  return api.get(`/posts/${id}/like`);
}

/**
 * Like a post
 * POST /api/posts/:id/like
 */
export async function likePost(id) {
  return api.post(`/posts/${id}/like`);
}

/**
 * Unlike a post
 * DELETE /api/posts/:id/like
 */
export async function unlikePost(id) {
  return api.delete(`/posts/${id}/like`);
}

/**
 * Get share status
 * GET /api/posts/:id/share
 */
export async function getShareStatus(id) {
  return api.get(`/posts/${id}/share`);
}

/**
 * Record a post share
 * POST /api/posts/:id/share
 */
export async function recordShare(id) {
  return api.post(`/posts/${id}/share`);
}

/**
 * Bookmark a post
 * POST /api/posts/:id/bookmark
 */
export async function bookmarkPost(id) {
  return api.post(`/posts/${id}/bookmark`);
}

/**
 * Remove bookmark
 * DELETE /api/posts/:id/bookmark
 */
export async function unbookmarkPost(id) {
  return api.delete(`/posts/${id}/bookmark`);
}
