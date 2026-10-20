/**
 * Appeal Service — user-facing and admin-facing appeal business logic.
 *
 * User-facing:
 *   submitAppeal(userId, contentType, contentId, reason)
 *   getMyAppeals(userId, pagination)
 *
 * Admin-facing:
 *   getPendingAppeals(pagination)
 *   getAppealById(appealId)
 *   reviewAppeal(appealId, admin, { decision, adminNote })
 *     decision = 'approved' | 'rejected'
 *     On approved  → restores the content via admin.service, fires notifyAppealReviewed.
 *     On rejected  → leaves content removed, fires notifyAppealReviewed.
 *
 * Integration:
 *   - Calls admin.service.restorePost / restoreComment on approval so every
 *     restoration is written to ModerationRecord exactly once.
 *   - Uses notificationService.notifyAppealReviewed (already wired in notification.service).
 */
'use strict';

const mongoose = require('mongoose');
const Appeal = require('../models/Appeal');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { buildPageMeta } = require('../utils/pagination');
const notificationService = require('./notification.service');

// Lazy-require admin.service to avoid a circular dependency at load time
// (admin.service does not require appeal.service, so it is safe to call at runtime).
function adminService() {
  return require('./admin.service');
}

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));
const sameId = (a, b) => Boolean(a && b && a.toString() === b.toString());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verifies that content exists and belongs to the appellant,
 * and that it is currently in a state that can be appealed (removed).
 * Returns { authorId, relatedPost, relatedComment }.
 */
async function loadAppealableContent(contentType, contentId) {
  if (contentType === 'post') {
    const post = await Post.findById(contentId).select('author status').lean();
    if (!post) throw ApiError.notFound('Post not found');
    if (post.status !== 'removed') {
      throw new ApiError(400, 'Only removed posts can be appealed.');
    }
    return { authorId: post.author, relatedPost: post._id, relatedComment: null };
  }

  // comment
  const comment = await Comment.findById(contentId)
    .select('author moderationStatus isDeleted post')
    .lean();
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.moderationStatus !== 'removed') {
    throw new ApiError(400, 'Only removed comments can be appealed.');
  }
  return { authorId: comment.author, relatedPost: comment.post, relatedComment: comment._id };
}

/** Serializes an appeal for user-facing responses. */
function serializeAppeal(a) {
  return {
    _id: a._id,
    contentType: a.contentType,
    contentId: a.contentId,
    reason: a.reason,
    status: a.status,
    adminNote: a.adminNote || '',
    reviewedBy: a.reviewedBy || null,
    reviewedAt: a.reviewedAt || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/** Serializes an appeal for admin-facing responses — includes appellant info. */
function serializeAppealForAdmin(a) {
  return {
    ...serializeAppeal(a),
    appellant: a.appellant
      ? { _id: a.appellant._id, username: a.appellant.username, email: a.appellant.email }
      : null,
  };
}

// ---------------------------------------------------------------------------
// User API
// ---------------------------------------------------------------------------

/**
 * Submits an appeal for removed content.
 *
 * Rules:
 *   - Content must exist and be in 'removed' state.
 *   - Caller must be the content author.
 *   - No pending appeal may already exist for this content (unique index handles DB race).
 *
 * @param {object} user        Authenticated user (req.user).
 * @param {string} contentType 'post' | 'comment'
 * @param {string} contentId   ObjectId string.
 * @param {string} reason      User explanation (10–1000 chars).
 * @returns {Promise<object>}  Serialized appeal.
 */
async function submitAppeal(user, contentType, contentId, reason) {
  const cid = toObjectId(contentId);

  const { authorId } = await loadAppealableContent(contentType, cid);

  if (!sameId(authorId, user._id)) {
    throw ApiError.forbidden('You can only appeal decisions on your own content.');
  }

  // Check for existing pending appeal (belt-and-suspenders before DB unique index fires).
  const existingPending = await Appeal.findOne({
    contentType,
    contentId: cid,
    status: 'pending',
  }).lean();
  if (existingPending) {
    throw new ApiError(409, 'You already have a pending appeal for this content.');
  }

  const appeal = await Appeal.create({
    appellant: user._id,
    contentType,
    contentId: cid,
    reason,
  });

  return serializeAppeal(appeal.toObject());
}

/**
 * Returns paginated appeals submitted by the authenticated user (all statuses).
 *
 * @param {object} user
 * @param {{ page, limit, skip }} pagination
 * @returns {Promise<{ appeals: object[], pagination: object }>}
 */
async function getMyAppeals(user, { page, limit, skip }) {
  const match = { appellant: toObjectId(user._id) };

  const [docs, total] = await Promise.all([
    Appeal.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Appeal.countDocuments(match),
  ]);

  return {
    appeals: docs.map(serializeAppeal),
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

/**
 * Returns paginated pending appeals for the admin queue (oldest first = FIFO).
 *
 * @param {{ page, limit, skip }} pagination
 * @returns {Promise<{ appeals: object[], pagination: object }>}
 */
async function getPendingAppeals({ page, limit, skip }) {
  const match = { status: 'pending' };

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: 1 } }, // FIFO — oldest first
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        let: { uid: '$appellant' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
          { $project: { username: 1, email: 1 } },
        ],
        as: 'appellant',
      },
    },
    { $unwind: { path: '$appellant', preserveNullAndEmptyArrays: true } },
  ];

  const [docs, total] = await Promise.all([
    Appeal.aggregate(pipeline),
    Appeal.countDocuments(match),
  ]);

  return {
    appeals: docs.map(serializeAppealForAdmin),
    pagination: buildPageMeta(total, page, limit),
  };
}

/**
 * Returns all appeals (all statuses) for the admin history view, newest first.
 *
 * @param {{ page, limit, skip, status }} opts  status is optional filter
 */
async function getAllAppeals({ page, limit, skip, status }) {
  const match = status ? { status } : {};

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        let: { uid: '$appellant' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
          { $project: { username: 1, email: 1 } },
        ],
        as: 'appellant',
      },
    },
    { $unwind: { path: '$appellant', preserveNullAndEmptyArrays: true } },
  ];

  const [docs, total] = await Promise.all([
    Appeal.aggregate(pipeline),
    Appeal.countDocuments(match),
  ]);

  return {
    appeals: docs.map(serializeAppealForAdmin),
    pagination: buildPageMeta(total, page, limit),
  };
}

/**
 * Returns a single appeal by ID (admin view — includes appellant details).
 * Throws 404 if not found.
 */
async function getAppealById(appealId) {
  const pipeline = [
    { $match: { _id: toObjectId(appealId) } },
    {
      $lookup: {
        from: 'users',
        let: { uid: '$appellant' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
          { $project: { username: 1, email: 1 } },
        ],
        as: 'appellant',
      },
    },
    { $unwind: { path: '$appellant', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        let: { rid: '$reviewedBy' },
        pipeline: [
          { $match: { $expr: { $and: [{ $ne: ['$$rid', null] }, { $eq: ['$_id', '$$rid'] }] } } },
          { $project: { username: 1 } },
        ],
        as: 'reviewedByDoc',
      },
    },
    {
      $addFields: {
        reviewedBy: { $ifNull: [{ $arrayElemAt: ['$reviewedByDoc', 0] }, null] },
      },
    },
    { $project: { reviewedByDoc: 0 } },
  ];

  const [doc] = await Appeal.aggregate(pipeline);
  if (!doc) throw ApiError.notFound('Appeal not found');
  return serializeAppealForAdmin(doc);
}

/**
 * Reviews an appeal — approves or rejects it.
 *
 * @param {string} appealId
 * @param {object} admin        req.user (role='admin')
 * @param {object} opts
 * @param {'approved'|'rejected'} opts.decision
 * @param {string}  [opts.adminNote]
 */
async function reviewAppeal(appealId, admin, { decision, adminNote = '' }) {
  const appeal = await Appeal.findById(appealId)
    .select('status contentType contentId appellant')
    .lean();
  if (!appeal) throw ApiError.notFound('Appeal not found');
  if (appeal.status !== 'pending') {
    throw new ApiError(400, `Appeal has already been ${appeal.status}.`);
  }

  const now = new Date();

  // Update the appeal record.
  await Appeal.updateOne(
    { _id: toObjectId(appealId) },
    {
      $set: {
        status: decision,
        reviewedBy: toObjectId(admin._id),
        reviewedAt: now,
        adminNote: adminNote || '',
      },
    }
  );

  // Determine notification context — we need relatedPost / relatedComment.
  let relatedPost = null;
  let relatedComment = null;

  if (decision === 'approved') {
    // Restore the content via admin.service so ModerationRecord is written consistently.
    try {
      if (appeal.contentType === 'post') {
        await adminService().restorePost(appeal.contentId, admin, {
          reason: 'Appeal approved' + (adminNote ? ': ' + adminNote : ''),
        });
        relatedPost = appeal.contentId;
      } else {
        await adminService().restoreComment(appeal.contentId, admin, {
          reason: 'Appeal approved' + (adminNote ? ': ' + adminNote : ''),
        });
        // Fetch comment.post for the notification reference.
        const c = await Comment.findById(appeal.contentId).select('post').lean();
        relatedPost = c ? c.post : null;
        relatedComment = appeal.contentId;
      }
    } catch (err) {
      // Content may have already been restored manually — log and continue.
      console.warn('[appeal] restoreContent warning:', err.message);
      if (appeal.contentType === 'post') relatedPost = appeal.contentId;
      else relatedComment = appeal.contentId;
    }
  } else {
    // Rejected — fetch context for notification without changing content status.
    if (appeal.contentType === 'post') {
      relatedPost = appeal.contentId;
    } else {
      const c = await Comment.findById(appeal.contentId).select('post').lean();
      relatedPost = c ? c.post : null;
      relatedComment = appeal.contentId;
    }
  }

  // Notify the appellant — fire-and-forget.
  notificationService
    .notifyAppealReviewed(relatedPost, appeal.appellant, decision)
    .catch((err) => console.error('[appeal-notify] reviewAppeal:', err));

  return { _id: appeal._id, status: decision, reviewedAt: now };
}

module.exports = {
  submitAppeal,
  getMyAppeals,
  getPendingAppeals,
  getAllAppeals,
  getAppealById,
  reviewAppeal,
};
