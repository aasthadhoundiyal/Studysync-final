/**
 * Share business logic.
 *
 * Key behaviours:
 *   - Sharing is idempotent: the second call for the same (post, user) pair is a no-op —
 *     `sharesCount` and `points` are NOT incremented again, and the shareable link is
 *     still returned so the frontend can always show it.
 *   - Only published posts can be shared (deleted / removed / pending return 404).
 *   - `sharesCount` and `points` are updated atomically and can never drop below 0.
 *   - `pointsAwarded` is stored on the Share document so a future un-share or post-delete
 *     can reverse the exact amount that was awarded, even if the point rules change.
 *   - The shareable link is built from CLIENT_URL so it always points at the frontend.
 */
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Share = require('../models/Share');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { pointsForEngagement, awardUserPoints } = require('./points.service');
const notificationService = require('./notification.service');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base URL of the frontend (first CLIENT_URL entry, no trailing slash). */
const clientBase = () => (env.clientUrls[0] || 'http://localhost:5173').replace(/\/$/, '');

/** Canonical shareable link for a post. */
const shareableUrl = (postId) => `${clientBase()}/posts/${postId}`;

/** Only published posts can be shared. */
async function findShareablePost(postId) {
  const post = await Post.findOne({ _id: postId, status: 'published' })
    .select('author sharesCount points')
    .lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

/**
 * Atomically increments sharesCount and points on a published post.
 * Returns null if the post has since been removed/deleted.
 */
async function adjustPostCounters(postId, { shares, points }) {
  return Post.findOneAndUpdate(
    { _id: postId, status: 'published' },
    [
      {
        $set: {
          sharesCount: { $max: [0, { $add: [{ $ifNull: ['$sharesCount', 0] }, shares] }] },
          points: { $max: [0, { $add: [{ $ifNull: ['$points', 0] }, points] }] },
        },
      },
    ],
    { returnDocument: 'after', projection: { sharesCount: 1, points: 1 }, updatePipeline: true }
  ).lean();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records a share for the current user and returns the updated share count + shareable URL.
 *
 * Idempotent: if the user has already shared this post, returns the current counts without
 * touching the database counters or awarding duplicate points.
 */
async function sharePost(postId, user) {
  const id = toObjectId(postId);
  const post = await findShareablePost(id);
  const pointsAwarded = pointsForEngagement('share', { actorId: user._id, authorId: post.author });

  let alreadyShared = false;

  try {
    await Share.create({ post: id, user: user._id, pointsAwarded });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate — user already shared this post. Return current state without side-effects.
      alreadyShared = true;
    } else {
      throw err;
    }
  }

  let sharesCount = post.sharesCount;

  if (!alreadyShared) {
    const [updated] = await Promise.all([
      adjustPostCounters(id, { shares: 1, points: pointsAwarded }),
      awardUserPoints(post.author, pointsAwarded), // award to the post's author
    ]);
    if (!updated) {
      // Post was deleted/hidden between our check and the update — roll back.
      await Share.deleteOne({ post: id, user: user._id });
      throw ApiError.notFound('Post not found');
    }
    sharesCount = updated.sharesCount;

    // Fire-and-forget: notify the post author about the share.
    notificationService
      .notifyShare(id, user._id, post.author, user.username)
      .catch((err) => console.error('[notify] sharePost:', err));
  }

  return {
    postId: id,
    shared: true,
    alreadyShared,
    sharesCount,
    shareUrl: shareableUrl(id),
  };
}

/**
 * Returns the current share count and the shareable URL for a post.
 * Also tells the caller whether the requesting user has already shared it.
 * Safe for anonymous callers (viewer may be null/undefined).
 */
async function getShareStatus(postId, viewer) {
  const id = toObjectId(postId);
  const post = await findShareablePost(id);

  const hasShared = viewer
    ? Boolean(await Share.exists({ post: id, user: viewer._id }))
    : false;

  return {
    postId: id,
    sharesCount: post.sharesCount,
    hasShared,
    shareUrl: shareableUrl(id),
  };
}

/**
 * Removes all Share documents for a post (called when the post is deleted).
 * Never throws — orphaned share records silently cleaned up.
 */
async function deleteSharesForPost(postId) {
  await Share.deleteMany({ post: postId });
}

module.exports = { sharePost, getShareStatus, deleteSharesForPost };
