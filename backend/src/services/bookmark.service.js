/**
 * Bookmark business logic.
 *
 * Operations are idempotent:
 *   - Saving an already-bookmarked post returns the current state without creating a duplicate.
 *   - Removing a bookmark that doesn't exist is a no-op (returns saved: false).
 *
 * The saved-posts list is paginated and returns full post cards (same shape as the feed)
 * so the frontend saved-posts page can reuse the existing post card component.
 */
const mongoose = require('mongoose');
const Bookmark = require('../models/Bookmark');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { buildPageMeta } = require('../utils/pagination');
// NOTE: post.service is required lazily inside getSavedPosts to avoid the circular
// dependency: post.service → bookmark.service → post.service.

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const result = (postId, saved, alreadySaved = false) => ({ postId, saved, alreadySaved });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verifies the post exists (any status so that bookmarking a pending/removed
 * post doesn't throw, but we still reject completely missing posts).
 */
async function assertPostExists(postId) {
  const exists = await Post.exists({ _id: postId });
  if (!exists) throw ApiError.notFound('Post not found');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Saves (bookmarks) a post for the current user.
 * Idempotent — a second call for the same (post, user) pair is a no-op.
 */
async function savePost(postId, user) {
  const pid = toObjectId(postId);
  await assertPostExists(pid);

  try {
    await Bookmark.create({ post: pid, user: user._id });
  } catch (err) {
    if (err.code === 11000) return result(pid, true, true); // already saved — no duplicate
    throw err;
  }

  return result(pid, true);
}

/**
 * Removes a bookmark.
 * Idempotent — if no bookmark exists, returns saved: false without an error.
 */
async function unsavePost(postId, user) {
  const pid = toObjectId(postId);
  await assertPostExists(pid);

  await Bookmark.deleteOne({ post: pid, user: user._id });
  return result(pid, false);
}

/**
 * Returns the bookmark status for a single post+viewer pair.
 * Non-existent posts return 404; anonymous viewers always get saved: false.
 */
async function getBookmarkStatus(postId, viewer) {
  const pid = toObjectId(postId);
  await assertPostExists(pid);

  const saved = viewer ? Boolean(await Bookmark.exists({ post: pid, user: viewer._id })) : false;
  return result(pid, saved);
}

/**
 * Returns the logged-in user's saved posts as paginated post cards.
 *
 * Strategy:
 *   1. Fetch the user's Bookmark documents (sorted by bookmark creation date, newest first).
 *   2. Collect the post IDs from that page.
 *   3. Re-run `aggregatePosts` on just those IDs so the result has the full post-card
 *      shape (author info, isLiked, isBookmarked, etc.).
 *   4. Re-sort the result to match the original bookmark order (aggregation doesn't preserve
 *      insertion order).
 *
 * This two-step approach avoids a single heavy aggregation and lets us reuse the
 * existing post pipeline without modification.
 */
async function getSavedPosts(user, { page, limit, skip, viewer }) {
  // Lazy-require to avoid circular dependency: post.service ↔ bookmark.service.
  // By call time both modules are fully initialised.
  const { aggregatePosts } = require('./post.service');

  // Total count of saved posts
  const total = await Bookmark.countDocuments({ user: user._id });

  // Fetch the bookmark documents for this page (newest bookmark first)
  const bookmarks = await Bookmark.find({ user: user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('post createdAt')
    .lean();

  if (bookmarks.length === 0) {
    return { posts: [], pagination: buildPageMeta(total, page, limit) };
  }

  const postIds = bookmarks.map((b) => b.post);

  // Fetch all post cards for this page in a single aggregation.
  // No sort/skip/limit inside aggregatePosts — we already have the exact IDs.
  const posts = await aggregatePosts(
    { _id: { $in: postIds } },
    { sort: 'newest', skip: 0, limit: postIds.length, viewer }
  );

  // Restore the original bookmark order (aggregation returns docs in natural order).
  const order = new Map(postIds.map((id, i) => [id.toString(), i]));
  posts.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));

  return { posts, pagination: buildPageMeta(total, page, limit) };
}

/**
 * Removes all bookmarks for a post (called when the post is deleted).
 * Never throws — a deleted post's bookmarks are silently cleaned up.
 */
async function deleteBookmarksForPost(postId) {
  await Bookmark.deleteMany({ post: postId });
}

/**
 * Checks whether `viewer` has bookmarked each of the given post IDs.
 * Returns a Set of post-ID strings that the viewer has saved.
 * Used by the aggregation pipeline to inject `isBookmarked` into post cards.
 */
async function getBookmarkedSet(postIds, viewer) {
  if (!viewer || !postIds.length) return new Set();
  const docs = await Bookmark.find({ post: { $in: postIds }, user: viewer._id }).select('post').lean();
  return new Set(docs.map((d) => d.post.toString()));
}

module.exports = {
  savePost,
  unsavePost,
  getBookmarkStatus,
  getSavedPosts,
  deleteBookmarksForPost,
  getBookmarkedSet,
};
