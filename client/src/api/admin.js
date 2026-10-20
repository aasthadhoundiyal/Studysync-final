import api from './client';

/**
 * Admin Moderation & Dashboard APIs
 */

export async function getAdminStats() {
  return api.get('/admin/stats');
}

export async function getPendingPosts(params = {}) {
  return api.get('/admin/posts/pending', params);
}

export async function getRemovedPosts(params = {}) {
  return api.get('/admin/posts/removed', params);
}

export async function getPendingComments(params = {}) {
  return api.get('/admin/comments/pending', params);
}

export async function getRemovedComments(params = {}) {
  return api.get('/admin/comments/removed', params);
}

export async function getModerationHistory(params = {}) {
  return api.get('/admin/moderation/history', params);
}

export async function approvePost(id, reason) {
  return api.post(`/admin/posts/${id}/approve`, { reason });
}

export async function removePost(id, reason) {
  return api.post(`/admin/posts/${id}/remove`, { reason });
}

export async function restorePost(id, reason) {
  return api.post(`/admin/posts/${id}/restore`, { reason });
}

export async function removeComment(id, reason) {
  return api.post(`/admin/comments/${id}/remove`, { reason });
}

export async function restoreComment(id, reason) {
  return api.post(`/admin/comments/${id}/restore`, { reason });
}

export async function getAdminUsers(params = {}) {
  return api.get('/admin/users', params);
}

export async function suspendUser(id) {
  return api.post(`/admin/users/${id}/suspend`);
}

export async function reactivateUser(id) {
  return api.post(`/admin/users/${id}/reactivate`);
}

export async function getPendingAppeals(params = {}) {
  return api.get('/admin/appeals/pending', params);
}

export async function getAllAppeals(params = {}) {
  return api.get('/admin/appeals', params);
}

export async function getAppealById(appealId) {
  return api.get(`/admin/appeals/${appealId}`);
}

export async function approveAppeal(appealId, adminNote) {
  return api.post(`/admin/appeals/${appealId}/approve`, { adminNote });
}

export async function rejectAppeal(appealId, adminNote) {
  return api.post(`/admin/appeals/${appealId}/reject`, { adminNote });
}
