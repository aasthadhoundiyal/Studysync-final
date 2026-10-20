/**
 * Admin Service — all admin dashboard and moderation business logic.
 *
 * Responsibilities:
 *   1. Dashboard statistics (counts)
 *   2. Content queues (pending, removed, history)
 *   3. Post moderation actions (approve, remove, restore)
 *   4. Comment moderation actions (remove, restore)
 *   5. User management (suspend, reactivate)
 *
 * Every mutating action:
 *   - Updates the content status atomically.
 *   - Writes a ModerationRecord for the audit trail.
 *   - Fires the appropriate notification (fire-and-forget, never blocks the action).
 */
'use strict';

const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const ModerationRecord = require('../models/ModerationRecord');
const ApiError = require('../utils/ApiError');
const { buildPageMeta } = require('../utils/pagination');
const notificationService = require('./notification.service');

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Records an admin action in the audit trail. */
async function recordAction(admin, { contentType, contentId, action, reason, previousStatus, newStatus }) {
  return ModerationRecord.create({
    admin: toObjectId(admin._id),
    contentType,
    contentId: toObjectId(contentId),
    action,
    reason: reason || '',
    previousStatus: previousStatus || '',
    newStatus: newStatus || '',
  });
}

/** Serializes a ModerationRecord for API responses. */
function serializeRecord(r) {
  return {
    _id: r._id,
    admin: r.admin,
    contentType: r.contentType,
    contentId: r.contentId,
    action: r.action,
    reason: r.reason,
    previousStatus: r.previousStatus,
    newStatus: r.newStatus,
    createdAt: r.createdAt,
  };
}

/** Lightweight post shape for admin queues. */
function serializePostForAdmin(p) {
  return {
    _id: p._id,
    title: p.title,
    content: (p.content || '').slice(0, 300),
    tags: p.tags || [],
    status: p.status,
    author: p.author
      ? { _id: p.author._id, username: p.author.username, email: p.author.email }
      : null,
    likesCount: p.likesCount || 0,
    commentsCount: p.commentsCount || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Lightweight comment shape for admin queues. */
function serializeCommentForAdmin(c) {
  return {
    _id: c._id,
    post: c.post,
    content: (c.content || '').slice(0, 300),
    moderationStatus: c.moderationStatus,
    isDeleted: c.isDeleted,
    author: c.author
      ? { _id: c.author._id, username: c.author.username, email: c.author.email }
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Lightweight user shape for admin user list. */
function serializeUserForAdmin(u) {
  return {
    _id: u._id,
    username: u.username,
    email: u.email,
    role: u.role,
    isSuspended: u.isSuspended,
    points: u.points,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

// ---------------------------------------------------------------------------
// Dashboard statistics
// ---------------------------------------------------------------------------

/**
 * Returns aggregate counts for the admin dashboard.
 * All counts run in parallel via Promise.all for performance.
 */
async function getDashboardStats() {
  const [
    totalUsers,
    totalPosts,
    totalComments,
    pendingPosts,
    removedPosts,
    pendingComments,
    removedComments,
    suspendedUsers,
  ] = await Promise.all([
    User.countDocuments({}),
    Post.countDocuments({}),
    Comment.countDocuments({ isDeleted: false }),
    Post.countDocuments({ status: 'pending_review' }),
    Post.countDocuments({ status: 'removed' }),
    Comment.countDocuments({ moderationStatus: 'pending_review' }),
    Comment.countDocuments({ moderationStatus: 'removed', isDeleted: false }),
    User.countDocuments({ isSuspended: true }),
  ]);

  return {
    users: { total: totalUsers, suspended: suspendedUsers },
    posts: { total: totalPosts, pending: pendingPosts, removed: removedPosts },
    comments: { total: totalComments, pending: pendingComments, removed: removedComments },
  };
}

// ---------------------------------------------------------------------------
// Content queues — paginated lists of posts/comments by status
// ---------------------------------------------------------------------------

/** Returns paginated posts by status (pending_review | removed). */
async function getPostsByStatus(status, { page, limit, skip }) {
  const match = { status };

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: User.collection.name,
        let: { authorId: '$author' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$authorId'] } } },
          { $project: { username: 1, email: 1 } },
        ],
        as: 'author',
      },
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
    { $project: { __v: 0 } },
  ];

  const [docs, total] = await Promise.all([
    Post.aggregate(pipeline),
    Post.countDocuments(match),
  ]);

  return {
    posts: docs.map(serializePostForAdmin),
    pagination: buildPageMeta(total, page, limit),
  };
}

/** Returns paginated comments by moderationStatus. */
async function getCommentsByStatus(status, { page, limit, skip }) {
  const match = { moderationStatus: status, isDeleted: false };

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: User.collection.name,
        let: { authorId: '$author' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$authorId'] } } },
          { $project: { username: 1, email: 1 } },
        ],
        as: 'author',
      },
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
    { $project: { __v: 0 } },
  ];

  const [docs, total] = await Promise.all([
    Comment.aggregate(pipeline),
    Comment.countDocuments(match),
  ]);

  return {
    comments: docs.map(serializeCommentForAdmin),
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// Moderation history
// ---------------------------------------------------------------------------

/**
 * Returns the global moderation history (all content types, newest first).
 * Joins admin user for display.
 */
async function getModerationHistory({ page, limit, skip, contentType }) {
  const match = contentType ? { contentType } : {};

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: User.collection.name,
        let: { adminId: '$admin' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$adminId'] } } },
          { $project: { username: 1 } },
        ],
        as: 'adminDoc',
      },
    },
    {
      $addFields: {
        admin: { $ifNull: [{ $arrayElemAt: ['$adminDoc', 0] }, { _id: '$admin', username: '[deleted]' }] },
      },
    },
    { $project: { adminDoc: 0, __v: 0 } },
  ];

  const [docs, total] = await Promise.all([
    ModerationRecord.aggregate(pipeline),
    ModerationRecord.countDocuments(match),
  ]);

  return {
    history: docs.map(serializeRecord),
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// Post moderation actions
// ---------------------------------------------------------------------------

/**
 * Approves a pending_review post and publishes it.
 * Only acts on 'pending_review' posts — use restorePost for 'removed'.
 */
async function approvePost(postId, admin, { reason = '' } = {}) {
  const post = await Post.findById(postId).select('author status title').lean();
  if (!post) throw ApiError.notFound('Post not found');
  if (post.status !== 'pending_review') {
    throw new ApiError(400, `Post is already "${post.status}" — only pending_review posts can be approved.`);
  }

  await Post.updateOne({ _id: postId }, { $set: { status: 'published' } });

  await recordAction(admin, {
    contentType: 'post',
    contentId: postId,
    action: 'approved',
    reason,
    previousStatus: 'pending_review',
    newStatus: 'published',
  });

  // Notify the author.
  notificationService.createNotification({
    recipient: post.author,
    actor: null,
    type: 'post_restored',
    message: 'Your post has been reviewed and approved.',
    relatedPost: post._id,
  }).catch((err) => console.error('[admin-notify] approvePost:', err));

  return { _id: post._id, status: 'published' };
}

/**
 * Removes a post (sets status to 'removed').
 * Works on any current status.
 */
async function removePost(postId, admin, { reason = '' } = {}) {
  const post = await Post.findById(postId).select('author status title').lean();
  if (!post) throw ApiError.notFound('Post not found');
  if (post.status === 'removed') {
    throw new ApiError(400, 'Post is already removed.');
  }

  const prevStatus = post.status;
  await Post.updateOne({ _id: postId }, { $set: { status: 'removed' } });

  await recordAction(admin, {
    contentType: 'post',
    contentId: postId,
    action: 'removed',
    reason,
    previousStatus: prevStatus,
    newStatus: 'removed',
  });

  // Notify the author.
  notificationService
    .notifyModerationRemoved(post._id, post.author, reason)
    .catch((err) => console.error('[admin-notify] removePost:', err));

  return { _id: post._id, status: 'removed' };
}

/**
 * Restores a removed post to 'published'.
 */
async function restorePost(postId, admin, { reason = '' } = {}) {
  const post = await Post.findById(postId).select('author status title').lean();
  if (!post) throw ApiError.notFound('Post not found');
  if (post.status !== 'removed') {
    throw new ApiError(400, `Post is "${post.status}" — only removed posts can be restored.`);
  }

  await Post.updateOne({ _id: postId }, { $set: { status: 'published' } });

  await recordAction(admin, {
    contentType: 'post',
    contentId: postId,
    action: 'restored',
    reason,
    previousStatus: 'removed',
    newStatus: 'published',
  });

  notificationService
    .notifyPostRestored(post._id, post.author)
    .catch((err) => console.error('[admin-notify] restorePost:', err));

  return { _id: post._id, status: 'published' };
}

// ---------------------------------------------------------------------------
// Comment moderation actions
// ---------------------------------------------------------------------------

/**
 * Removes a comment (admin moderation — sets moderationStatus to 'removed').
 * Does NOT soft-delete; uses the dedicated moderationStatus field.
 */
async function removeComment(commentId, admin, { reason = '' } = {}) {
  const comment = await Comment.findById(commentId)
    .select('author moderationStatus isDeleted post')
    .lean();
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.moderationStatus === 'removed') {
    throw new ApiError(400, 'Comment is already removed.');
  }

  const prevStatus = comment.moderationStatus;
  await Comment.updateOne({ _id: commentId }, { $set: { moderationStatus: 'removed' } });

  await recordAction(admin, {
    contentType: 'comment',
    contentId: commentId,
    action: 'removed',
    reason,
    previousStatus: prevStatus,
    newStatus: 'removed',
  });

  // Reuse the moderation_removed notification type — relatedComment instead of relatedPost.
  notificationService.createNotification({
    recipient: comment.author,
    actor: null,
    type: 'moderation_removed',
    message: `Your comment was removed by a moderator.${reason ? ' Reason: ' + reason : ''}`,
    relatedPost: comment.post,
    relatedComment: comment._id,
  }).catch((err) => console.error('[admin-notify] removeComment:', err));

  return { _id: comment._id, moderationStatus: 'removed' };
}

/**
 * Restores a removed comment (sets moderationStatus back to 'published').
 */
async function restoreComment(commentId, admin, { reason = '' } = {}) {
  const comment = await Comment.findById(commentId)
    .select('author moderationStatus isDeleted post')
    .lean();
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.moderationStatus !== 'removed') {
    throw new ApiError(400, `Comment moderationStatus is "${comment.moderationStatus}" — only removed comments can be restored.`);
  }

  await Comment.updateOne({ _id: commentId }, { $set: { moderationStatus: 'published' } });

  await recordAction(admin, {
    contentType: 'comment',
    contentId: commentId,
    action: 'restored',
    reason,
    previousStatus: 'removed',
    newStatus: 'published',
  });

  notificationService.createNotification({
    recipient: comment.author,
    actor: null,
    type: 'post_restored',
    message: 'Your comment has been restored.',
    relatedPost: comment.post,
    relatedComment: comment._id,
  }).catch((err) => console.error('[admin-notify] restoreComment:', err));

  return { _id: comment._id, moderationStatus: 'published' };
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/**
 * Returns paginated list of all users (for admin user management).
 */
async function listUsers({ page, limit, skip, search }) {
  const match = search
    ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};

  const [docs, total] = await Promise.all([
    User.find(match)
      .select('username email role isSuspended points createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(match),
  ]);

  return {
    users: docs.map(serializeUserForAdmin),
    pagination: buildPageMeta(total, page, limit),
  };
}

/**
 * Suspends a user account.
 * Admins cannot suspend other admins.
 */
async function suspendUser(targetUserId, admin) {
  if (targetUserId.toString() === admin._id.toString()) {
    throw new ApiError(400, 'You cannot suspend your own account.');
  }

  const user = await User.findById(targetUserId).select('role isSuspended username').lean();
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw new ApiError(403, 'Admins cannot suspend other admins.');
  if (user.isSuspended) throw new ApiError(400, 'User is already suspended.');

  await User.updateOne({ _id: targetUserId }, { $set: { isSuspended: true } });

  return { _id: user._id, username: user.username, isSuspended: true };
}

/**
 * Reactivates a suspended user account.
 */
async function reactivateUser(targetUserId, admin) {
  const user = await User.findById(targetUserId).select('isSuspended username').lean();
  if (!user) throw ApiError.notFound('User not found');
  if (!user.isSuspended) throw new ApiError(400, 'User is not suspended.');

  await User.updateOne({ _id: targetUserId }, { $set: { isSuspended: false } });

  return { _id: user._id, username: user.username, isSuspended: false };
}

module.exports = {
  getDashboardStats,
  getPostsByStatus,
  getCommentsByStatus,
  getModerationHistory,
  approvePost,
  removePost,
  restorePost,
  removeComment,
  restoreComment,
  listUsers,
  suspendUser,
  reactivateUser,
};
