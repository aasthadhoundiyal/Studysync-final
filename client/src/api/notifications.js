import api from './client';

/**
 * Get notification list for authenticated user
 * GET /api/notifications?page=&limit=&unread=true
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {boolean} [params.unread]
 */
export async function getNotifications({ page = 1, limit = 20, unread = false } = {}) {
  const params = { page, limit };
  if (unread) {
    params.unread = 'true';
  }
  return api.get('/notifications', params);
}

/**
 * Get unread notifications count for authenticated user
 * GET /api/notifications/unread-count
 * Returns { success: true, unreadCount: number }
 */
export async function getUnreadCount() {
  return api.get('/notifications/unread-count');
}

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 * @param {string} id
 */
export async function markAsRead(id) {
  return api.patch(`/notifications/${id}/read`);
}
export const markNotificationAsRead = markAsRead;

/**
 * Mark all notifications as read for authenticated user
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead() {
  return api.patch('/notifications/read-all');
}
export const markAllNotificationsAsRead = markAllAsRead;

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markNotificationAsRead,
  markAllAsRead,
  markAllNotificationsAsRead,
};
