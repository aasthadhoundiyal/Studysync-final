/**
 * Notification model.
 *
 * Notification types:
 *   Engagement (triggered automatically by services):
 *     like           — someone liked your post
 *     comment        — someone commented on your post
 *     reply          — someone replied to your comment
 *     share          — someone shared your post
 *
 *   Moderation (triggered by the moderation/appeals system — hooks exported by notification.service):
 *     moderation_removed  — your post was removed by a moderator/admin
 *     appeal_reviewed     — your appeal was reviewed (outcome stored in message)
 *     post_restored       — your post was restored after a successful appeal
 *
 * Design decisions:
 *   - `actor` may be null for system/moderation notifications (no specific person acting).
 *   - `relatedPost` / `relatedComment` are soft references (no cascade delete constraint) —
 *     they may become orphaned if the target is deleted, which is fine for notifications.
 *   - Notifications are never hard-deleted from the API; they can only be marked read.
 *     Cleanup is a future maintenance concern (e.g. TTL index or a cron job).
 *   - A TTL index (180 days) automatically purges old notifications to keep the collection small.
 */
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'like',
  'comment',
  'reply',
  'share',
  'moderation_removed',
  'appeal_reviewed',
  'post_restored',
];

const notificationSchema = new mongoose.Schema(
  {
    /** The user who receives this notification. */
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * The user whose action triggered the notification.
     * Null for system/moderation notifications where no specific actor is relevant.
     */
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Discriminator for the notification type — drives the frontend display template. */
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },

    /**
     * Human-readable message, pre-rendered server-side so the frontend only needs to display it.
     * Example: "alice liked your post"
     */
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    /** Reference to the post involved (if any). Soft reference — may be null. */
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },

    /** Reference to the comment involved (for comment/reply types). Soft reference — may be null. */
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    /** Whether the recipient has read this notification. */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Primary read pattern: all notifications for a recipient, newest first.
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Unread count query: { recipient, isRead: false }
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// TTL: automatically remove notifications older than 180 days to keep the collection lean.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
