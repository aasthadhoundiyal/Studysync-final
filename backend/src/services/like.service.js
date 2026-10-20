/**
 * Like / unlike business logic.
 *
 * Both operations are idempotent:
 *   - liking an already-liked post returns the current state without creating a duplicate
 *   - unliking a post that isn't liked is a no-op
 *
 * Counters are updated with atomic increments (never set from request data) and clamped at 0.
 */
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Like = require('../models/Like');
const ApiError = require('../utils/ApiError');
const { pointsForEngagement, awardUserPoints } = require('./points.service');
const notificationService = require('./notification.service');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/** Atomically adjusts likesCount and points on a published post, never letting either drop below 0. */
async function adjustPostCounters(postId, { likes, points }) {
  return Post.findOneAndUpdate(
    { _id: postId, status: 'published' },
    [
      {
        $set: {
          likesCount: { $max: [0, { $add: [{ $ifNull: ['$likesCount', 0] }, likes] }] },
          points: { $max: [0, { $add: [{ $ifNull: ['$points', 0] }, points] }] },
        },
      },
    ],
    { returnDocument: 'after', projection: { likesCount: 1, points: 1 }, updatePipeline: true }
  ).lean();
}

/** Only published posts can be liked/unliked. Deleted, missing, pending or removed posts return 404. */
async function findLikeablePost(postId) {
  const post = await Post.findOne({ _id: postId, status: 'published' }).select('author likesCount points').lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

const result = (postId, liked, likesCount) => ({ postId, liked, likesCount });

async function likePost(postId, user) {
  const id = toObjectId(postId);
  const post = await findLikeablePost(id);
  const pointsAwarded = pointsForEngagement('like', { actorId: user._id, authorId: post.author });

  try {
    await Like.create({ post: id, user: user._id, pointsAwarded });
  } catch (err) {
    if (err.code === 11000) return result(id, true, post.likesCount); // already liked — no duplicate
    throw err;
  }

  const [updated] = await Promise.all([
    adjustPostCounters(id, { likes: 1, points: pointsAwarded }),
    awardUserPoints(post.author, pointsAwarded), // award to the post's author
  ]);
  if (!updated) {
    // Post was deleted/hidden between the check and the update — roll back the like.
    await Like.deleteOne({ post: id, user: user._id });
    throw ApiError.notFound('Post not found');
  }

  // Fire-and-forget: notify the post author. Never blocks the response.
  notificationService
    .notifyLike(id, user._id, post.author, user.username)
    .catch((err) => console.error('[notify] likePost:', err));

  return result(id, true, updated.likesCount);
}

async function unlikePost(postId, user) {
  const id = toObjectId(postId);
  const post = await findLikeablePost(id);

  const like = await Like.findOneAndDelete({ post: id, user: user._id }).lean();
  if (!like) return result(id, false, post.likesCount); // wasn't liked — nothing to do

  const [updated] = await Promise.all([
    adjustPostCounters(id, { likes: -1, points: -(like.pointsAwarded || 0) }),
    awardUserPoints(post.author, -(like.pointsAwarded || 0)), // reverse author's points
  ]);
  return result(id, false, updated ? updated.likesCount : Math.max(0, post.likesCount - 1));
}

/** Like status for the current viewer (anonymous viewers get liked: false). */
async function getLikeStatus(postId, viewer) {
  const id = toObjectId(postId);
  const post = await findLikeablePost(id);
  const liked = viewer ? Boolean(await Like.exists({ post: id, user: viewer._id })) : false;
  return result(id, liked, post.likesCount);
}

/** Removes all likes of a post (used when a post is deleted). */
async function deleteLikesForPost(postId) {
  await Like.deleteMany({ post: postId });
}

/**
 * Recomputes likesCount from the likes collection (maintenance; see scripts/recountLikes.js).
 * @returns {Promise<number>} number of posts whose count was corrected
 */
async function recountAllLikes() {
  const counts = await Like.aggregate([{ $group: { _id: '$post', count: { $sum: 1 } } }]);
  const byPost = new Map(counts.map((c) => [c._id.toString(), c.count]));

  let fixed = 0;
  const cursor = Post.find().select('likesCount').lean().cursor();
  for await (const post of cursor) {
    const actual = byPost.get(post._id.toString()) || 0;
    if (post.likesCount !== actual) {
      await Post.updateOne({ _id: post._id }, { $set: { likesCount: actual } });
      fixed += 1;
    }
  }
  return fixed;
}

module.exports = { likePost, unlikePost, getLikeStatus, deleteLikesForPost, recountAllLikes };
