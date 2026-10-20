/**
 * Notification controller — thin HTTP layer over notification.service.
 *
 * All endpoints require authentication (protect middleware applied in routes).
 *
 * GET    /api/notifications               list paginated notifications
 * GET    /api/notifications/unread-count  unread count
 * PATCH  /api/notifications/:id/read      mark one read
 * PATCH  /api/notifications/read-all      mark all read
 */
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const notificationService = require('../services/notification.service');

/**
 * GET /api/notifications?page=&limit=&unread=true
 * Returns paginated notifications for the authenticated user, newest first.
 * Pass ?unread=true to filter to unread only.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const unreadOnly = req.query.unread === 'true';

  const result = await notificationService.getNotifications(req.user._id, { page, limit, skip, unreadOnly });
  res.json({ success: true, ...result });
});

/**
 * GET /api/notifications/unread-count
 * Returns the number of unread notifications for the authenticated user.
 * Cheap — backed by a compound index.  Designed to be polled by a UI badge.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, unreadCount: count });
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if the notification does not exist or does not belong to the requesting user.
 */
const markOneRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markOneRead(req.params.id, req.user._id);
  res.json({ success: true, message: 'Notification marked as read', notification: result });
});

/**
 * PATCH /api/notifications/read-all
 * Marks ALL unread notifications for the authenticated user as read.
 * Returns the count of notifications that were updated.
 */
const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllRead(req.user._id);
  res.json({ success: true, message: 'All notifications marked as read', updatedCount: count });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead,
};
