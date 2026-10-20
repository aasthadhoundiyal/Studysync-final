/**
 * Notification routes.
 *
 * All endpoints require a valid JWT (protect middleware).
 * Ownership of individual notifications is enforced inside notification.service.
 *
 * IMPORTANT — route ordering:
 *   /read-all must be declared BEFORE /:id/read so Express does not treat
 *   "read-all" as a notification :id.
 */
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParam } = require('../validators/common');
const ctrl = require('../controllers/notification.controller');

const router = Router();

// All notification routes are authenticated
router.use(protect);

// GET  /api/notifications?page=&limit=&unread=true
router.get('/', ctrl.getNotifications);

// GET  /api/notifications/unread-count
router.get('/unread-count', ctrl.getUnreadCount);

// PATCH /api/notifications/read-all   — must come before /:id/read
router.patch('/read-all', ctrl.markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', validate([mongoIdParam('id', 'notification ID')]), ctrl.markOneRead);

module.exports = router;
