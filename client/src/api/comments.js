import api, { request } from './client';

/**
 * Get top-level comments for a post
 * GET /api/posts/:postId/comments?page=&limit=
 */
export async function getComments(postId, params = {}) {
  return api.get(`/posts/${postId}/comments`, params);
}

/**
 * Add a top-level comment to a post
 * POST /api/posts/:postId/comments
 * Accepts FormData (with 'content' and 'attachments[]') or object/string { content }
 */
export async function addComment(postId, data) {
  if (data instanceof FormData) {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: data,
      isFormData: true,
    });
  }
  const body = typeof data === 'string' ? { content: data } : data;
  return api.post(`/posts/${postId}/comments`, body);
}

/**
 * Soft-delete a comment or reply (author or admin)
 * DELETE /api/posts/:postId/comments/:commentId
 */
export async function deleteComment(postId, commentId) {
  return api.delete(`/posts/${postId}/comments/${commentId}`);
}

/**
 * Get replies for a top-level comment
 * GET /api/posts/:postId/comments/:commentId/replies?page=&limit=
 */
export async function getReplies(postId, commentId, params = {}) {
  return api.get(`/posts/${postId}/comments/${commentId}/replies`, params);
}

/**
 * Add a reply to a comment
 * POST /api/posts/:postId/comments/:commentId/replies
 * Accepts FormData or object/string { content }
 */
export async function addReply(postId, commentId, data) {
  if (data instanceof FormData) {
    return request(`/posts/${postId}/comments/${commentId}/replies`, {
      method: 'POST',
      body: data,
      isFormData: true,
    });
  }
  const body = typeof data === 'string' ? { content: data } : data;
  return api.post(`/posts/${postId}/comments/${commentId}/replies`, body);
}

export default {
  getComments,
  addComment,
  deleteComment,
  getReplies,
  addReply,
};
