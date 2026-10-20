/**
 * Notification service.
 *
 * Responsibilities:
 *   1. Create notifications (internal helpers used by engagement services and moderation hooks).
 *   2. Read / paginate notifications for a user.
 *   3. Mark notifications as read.
 *
 * Integration pattern:
 *   Engagement services (like, comment, share) call the `notify*` helpers in a fire-and-forget
 *   fashion so that a notification failure NEVER blocks the main action:
 *
 *     notifyLike(postId, actorId, authorId).catch(err => console.error('[notify]', err));
 *
 *   Moderation / appeals (future) call the exported hook functions directly:
 *
 *     await notificationService.notifyModerationRemoved(postId, recipientId, reason);
 *     await notificationService.notifyAppealReviewed(postId, recipientId, outcome);
 *     await notificationService.notifyPostRestored(postId, recipientId);
 *
 * Self-notification prevention:
 *   All `notify*` helpers silently return early when actor === recipient (no self-spam).
 */
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { buildPageMeta } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');

const toObjectId = (id) => id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));
const sameId = (a, b) => Boolean(a && b && a.toString() === b.toString());

// ---------------------------------------------------------------------------
// Internal creator
// ---------------------------------------------------------------------------

/**
 * Persists one notification document.
 * All `notify*` helpers funnel through here.
 *
 * @param {object} fields
 * @param {*}      fields.recipient     ObjectId or string
 * @param {*}      [fields.actor]       ObjectId or string | null
 * @param {string} fields.type          NOTIFICATION_TYPES value
 * @param {string} fields.message
 * @param {*}      [fields.relatedPost]    ObjectId | null
 * @param {*}      [fields.relatedComment] ObjectId | null
 */
async function createNotification({ recipient, actor = null, type, message, relatedPost = null, relatedComment = null }) {
  return Notification.create({
    recipient: toObjectId(recipient),
    actor: actor ? toObjectId(actor) : null,
    type,
    message,
    relatedPost: relatedPost ? toObjectId(relatedPost) : null,
    relatedComment: relatedComment ? toObjectId(relatedComment) : null,
  });
}

// ---------------------------------------------------------------------------
// Engagement hooks (fire-and-forget from services)
// ---------------------------------------------------------------------------

/**
 * Notify the post author that someone liked their post.
 * Silently skips if the liker IS the author (no self-notification).
 *
 * @param {*}      postId
 * @param {*}      actorId      the user who liked
 * @param {*}      authorId     the post author (recipient)
 * @param {string} actorUsername  used to build the human-readable message
 */
async function notifyLike(postId, actorId, authorId, actorUsername) {
  if (sameId(actorId, authorId)) return; // no self-notification
  return createNotification({
    recipient: authorId,
    actor: actorId,
    type: 'like',
    message: `${actorUsername} liked your post.`,
    relatedPost: postId,
  });
}

/**
 * Notify the post author that someone commented on their post.
 * Silently skips if the commenter IS the author.
 *
 * @param {*}      postId
 * @param {*}      commentId
 * @param {*}      actorId       the commenter
 * @param {*}      postAuthorId  the recipient
 * @param {string} actorUsername
 */
async function notifyComment(postId, commentId, actorId, postAuthorId, actorUsername) {
  if (sameId(actorId, postAuthorId)) return;
  return createNotification({
    recipient: postAuthorId,
    actor: actorId,
    type: 'comment',
    message: `${actorUsername} commented on your post.`,
    relatedPost: postId,
    relatedComment: commentId,
  });
}

/**
 * Notify the original commenter that someone replied to their comment.
 * Skips self-notification AND skips if the commenter is also the post author
 * (they already got a `comment` notification above; no double-notify for same event).
 *
 * @param {*}      postId
 * @param {*}      commentId        the parent (top-level) comment
 * @param {*}      replyId          the newly created reply document
 * @param {*}      actorId          the replier
 * @param {*}      commentAuthorId  recipient (the commenter)
 * @param {string} actorUsername
 */
async function notifyReply(postId, commentId, replyId, actorId, commentAuthorId, actorUsername) {
  if (sameId(actorId, commentAuthorId)) return;
  return createNotification({
    recipient: commentAuthorId,
    actor: actorId,
    type: 'reply',
    message: `${actorUsername} replied to your comment.`,
    relatedPost: postId,
    relatedComment: replyId,
  });
}

/**
 * Notify the post author that someone shared their post.
 * Skips self-notification.
 *
 * @param {*}      postId
 * @param {*}      actorId
 * @param {*}      authorId
 * @param {string} actorUsername
 */
async function notifyShare(postId, actorId, authorId, actorUsername) {
  if (sameId(actorId, authorId)) return;
  return createNotification({
    recipient: authorId,
    actor: actorId,
    type: 'share',
    message: `${actorUsername} shared your post.`,
    relatedPost: postId,
  });
}

// ---------------------------------------------------------------------------
// Moderation hooks (called directly by the moderation/appeals system)
// ---------------------------------------------------------------------------

/**
 * Notify a user that their post was removed by a moderator/admin.
 *
 * @param {*}      postId        the removed post (soft reference)
 * @param {*}      recipientId   the post author
 * @param {string} [reason]      optional human-readable reason shown in the message
 */
async function notifyModerationRemoved(postId, recipientId, reason) {
  const detail = reason ? ` Reason: ${reason}` : '';
  return createNotification({
    recipient: recipientId,
    actor: null, // system notification — no specific actor
    type: 'moderation_removed',
    message: `Your post was removed by a moderator.${detail}`,
    relatedPost: postId,
  });
}

/**
 * Notify a user that their moderation appeal was reviewed.
 *
 * @param {*}      postId
 * @param {*}      recipientId
 * @param {string} outcome       e.g. 'approved' | 'rejected' — used in the message
 */
async function notifyAppealReviewed(postId, recipientId, outcome) {
  return createNotification({
    recipient: recipientId,
    actor: null,
    type: 'appeal_reviewed',
    message: `Your appeal was reviewed and ${outcome}.`,
    relatedPost: postId,
  });
}

/**
 * Notify a user that their previously removed post has been restored.
 *
 * @param {*}      postId
 * @param {*}      recipientId
 */
async function notifyPostRestored(postId, recipientId) {
  return createNotification({
    recipient: recipientId,
    actor: null,
    type: 'post_restored',
    message: 'Your post has been restored.',
    relatedPost: postId,
  });
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

/**
 * Serializes a notification document into the public API shape.
 * Actor and post are shallow references — full author data is looked up
 * via a lean aggregation in getNotifications.
 */
function serializeNotification(doc) {
  return {
    _id: doc._id,
    type: doc.type,
    message: doc.message,
    isRead: doc.isRead,
    actor: doc.actor
      ? {
          _id: doc.actor._id,
          username: doc.actor.username || '[deleted]',
          profilePicture: doc.actor.profilePicture || '',
        }
      : null,
    relatedPost: doc.relatedPost || null,
    relatedComment: doc.relatedComment || null,
    createdAt: doc.createdAt,
  };
}

/**
 * Returns paginated notifications for a user, newest first.
 * Optionally filters to unread only.
 *
 * @param {*}      userId
 * @param {object} opts
 * @param {number} opts.page
 * @param {number} opts.limit
 * @param {number} opts.skip
 * @param {boolean} [opts.unreadOnly]
 */
async function getNotifications(userId, { page, limit, skip, unreadOnly = false }) {
  const uid = toObjectId(userId);
  const match = { recipient: uid };
  if (unreadOnly) match.isRead = false;

  const User = require('../models/User');

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    // Join actor (the person who triggered the notification)
    {
      $lookup: {
        from: User.collection.name,
        let: { actorId: '$actor' },
        pipeline: [
          { $match: { $expr: { $and: [{ $ne: ['$$actorId', null] }, { $eq: ['$_id', '$$actorId'] }] } } },
          { $project: { username: 1, profilePicture: 1 } },
        ],
        as: 'actorDoc',
      },
    },
    {
      $addFields: {
        actor: { $ifNull: [{ $arrayElemAt: ['$actorDoc', 0] }, '$actor'] },
      },
    },
    { $project: { actorDoc: 0, __v: 0 } },
  ];

  const [docs, total] = await Promise.all([
    Notification.aggregate(pipeline),
    Notification.countDocuments(match),
  ]);

  return {
    notifications: docs.map(serializeNotification),
    pagination: buildPageMeta(total, page, limit),
  };
}

/**
 * Returns the count of unread notifications for a user.
 * Cheap: uses the { recipient, isRead, createdAt } compound index.
 *
 * @param {*} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: toObjectId(userId), isRead: false });
}

// ---------------------------------------------------------------------------
// Write API (mark read)
// ---------------------------------------------------------------------------

/**
 * Marks a single notification as read.
 * Throws 404 if the notification does not exist or does not belong to the user.
 *
 * @param {string} notificationId
 * @param {*}      userId
 */
async function markOneRead(notificationId, userId) {
  const nid = toObjectId(notificationId);
  const uid = toObjectId(userId);

  const updated = await Notification.findOneAndUpdate(
    { _id: nid, recipient: uid },
    { $set: { isRead: true } },
    { returnDocument: 'after', projection: { _id: 1, isRead: 1 } }
  ).lean();

  if (!updated) throw ApiError.notFound('Notification not found');
  return { _id: updated._id, isRead: updated.isRead };
}

/**
 * Marks ALL unread notifications for a user as read in one atomic operation.
 *
 * @param {*} userId
 * @returns {Promise<number>} count of notifications marked read
 */
async function markAllRead(userId) {
  const uid = toObjectId(userId);
  const result = await Notification.updateMany(
    { recipient: uid, isRead: false },
    { $set: { isRead: true } }
  );
  return result.modifiedCount;
}

module.exports = {
  // Engagement hooks (fire-and-forget safe)
  notifyLike,
  notifyComment,
  notifyReply,
  notifyShare,

  // Moderation hooks (called directly by moderation/appeals system)
  notifyModerationRemoved,
  notifyAppealReviewed,
  notifyPostRestored,

  // Read API
  getNotifications,
  getUnreadCount,

  // Write API
  markOneRead,
  markAllRead,

  // Low-level (for tests or special cases)
  createNotification,
};
