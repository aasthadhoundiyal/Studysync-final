import api, { request } from './client';

/**
 * Get current authenticated user profile
 * GET /api/users/me
 */
export async function getMe() {
  return api.get('/users/me');
}

/**
 * Update current user profile
 * PATCH /api/users/me
 */
export async function updateProfile(data) {
  return api.patch('/users/me', data);
}

/**
 * Update username
 * PATCH /api/users/me/username
 */
export async function changeUsername(username) {
  return api.patch('/users/me/username', { username });
}

/**
 * Update bio
 * PATCH /api/users/me/bio
 */
export async function updateBio(bio) {
  return api.patch('/users/me/bio', { bio });
}

/**
 * Upload profile avatar image
 * PUT /api/users/me/profile-picture
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('profilePicture', file);
  return request('/users/me/profile-picture', {
    method: 'PUT',
    body: formData,
    isFormData: true,
  });
}

/**
 * Remove avatar
 * DELETE /api/users/me/profile-picture
 */
export async function removeAvatar() {
  return api.delete('/users/me/profile-picture');
}

/**
 * Get current streak information
 * GET /api/users/me/streak
 */
export async function getStreak() {
  return api.get('/users/me/streak');
}

/**
 * Restore streak using monthly restore token
 * POST /api/users/me/streak/restore
 */
export async function restoreStreak() {
  return api.post('/users/me/streak/restore');
}

/**
 * Get saved/bookmarked posts
 * GET /api/users/me/bookmarks
 */
export async function getBookmarks(params = {}) {
  return api.get('/users/me/bookmarks', params);
}

/**
 * Get public profile of a user by username or ID
 * GET /api/users/:identifier
 */
export async function getProfile(identifier) {
  return api.get(`/users/${identifier}`);
}

/**
 * Get posts created by a specific user
 * GET /api/users/:identifier/posts
 */
export async function getUserPosts(identifier, params = {}) {
  return api.get(`/users/${identifier}/posts`, params);
}
