/**
 * Post business logic.
 *
 * All read paths go through `aggregatePosts`, so every endpoint returns posts in the
 * same "post card" shape (see `serializePost`).
 */
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const ApiError = require('../utils/ApiError');
const { deleteLocalUpload } = require('../utils/files');
const { buildPageMeta } = require('../utils/pagination');
const { deleteLikesForPost } = require('./like.service');
const { deleteCommentsForPost } = require('./comment.service');
// NOTE: bookmark.service and share.service are required lazily inside deletePost
// to avoid circular dependency: post.service → bookmark.service → post.service.

const { levelFromPoints, levelInfo } = require('../services/points.service');

// levelFromPoints also comes from points.service — re-export it from User is kept for backward compat.

/**
 * Trending score (Hacker-News style): engagement points decayed by age.
 *   score = (points + 1) / (ageHours + 2) ^ GRAVITY
 * New posts get a chance to surface; older posts need more points to stay on top.
 * Exported so search.service can reuse the same constant.
 */
const TRENDING_GRAVITY = 1.5;

const SORT_STAGES = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  trending: { trendingScore: -1, createdAt: -1, _id: -1 },
};

const isAdmin = (user) => Boolean(user && user.role === 'admin');
const isSameId = (a, b) => Boolean(a && b && a.toString() === b.toString());

/** Converts an aggregated post document into the shape used by the frontend post card. */
function serializePost(doc, viewer) {
  const author = doc.author
    ? {
        _id: doc.author._id,
        username: doc.author.username,
        profilePicture: doc.author.profilePicture || '',
        level: levelFromPoints(doc.author.points),
        levelName: levelInfo(doc.author.points).levelName,
        currentStreak: doc.author.currentStreak || 0,
      }
    : { _id: null, username: '[deleted]', profilePicture: '', level: 1, levelName: 'Beginner', currentStreak: 0 };

  const isOwner = Boolean(viewer && doc.author && isSameId(viewer._id, doc.author._id));

  return {
    _id: doc._id,
    title: doc.title,
    content: doc.content,
    tags: doc.tags || [],
    attachments: (doc.attachments || []).map((a) => ({
      _id: a._id,
      type: a.type,
      url: a.url,
      originalName: a.originalName,
      mimeType: a.mimeType,
      extension: a.extension,
      size: a.size,
    })),
    author,
    likesCount: doc.likesCount || 0,
    commentsCount: doc.commentsCount || 0,
    sharesCount: doc.sharesCount || 0,
    points: doc.points || 0,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // Viewer-specific flags
    isLiked: Boolean(doc.isLiked),
    isBookmarked: Boolean(doc.isBookmarked),
    isOwner,
    canDelete: isOwner || isAdmin(viewer),
  };
}

/**
 * Runs the shared post aggregation: match -> (trending score) -> sort -> paginate -> join author -> viewer like.
 * `isLiked` is resolved per viewer from the Like collection (uses the unique post+user index).
 *
 * @param {object} match  MongoDB match filter (already includes status filter)
 * @param {object} [opts]
 * @param {string} [opts.sort]   newest|oldest|trending (default: newest)
 * @param {number} [opts.skip]   Pagination skip
 * @param {number} [opts.limit]  Pagination limit
 * @param {object} [opts.viewer] Authenticated user for viewer-specific flags
 * @param {string} [opts.q]      Optional full-text search query (uses the $text index)
 */
async function aggregatePosts(match, { sort = 'newest', skip = 0, limit = 10, viewer = null, q } = {}) {
  // If a text-search query is provided, merge it into the match stage so the index is used.
  const effectiveMatch = q ? { ...match, $text: { $search: q } } : match;
  const pipeline = [{ $match: effectiveMatch }];

  // For text-search + relevance sort, surface the textScore field.
  if (q) {
    pipeline.push({ $addFields: { textScore: { $meta: 'textScore' } } });
  }

  if (sort === 'trending') {
    pipeline.push({
      $addFields: {
        trendingScore: {
          $divide: [
            { $add: [{ $ifNull: ['$points', 0] }, 1] },
            {
              $pow: [
                { $add: [{ $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60] }, 2] },
                TRENDING_GRAVITY,
              ],
            },
          ],
        },
      },
    });
  }

  // Resolve sort stage — when a text query is present and no explicit sort is requested,
  // default to newest (relevance-only sort lives in search.service for the /search endpoints).
  const activeSortStage = SORT_STAGES[sort] || SORT_STAGES.newest;
  // If textScore was added, include it as a secondary sort key for relevance when q is present.
  const finalSortStage = q
    ? { textScore: { $meta: 'textScore' }, ...activeSortStage }
    : activeSortStage;

  pipeline.push(
    { $sort: finalSortStage },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: User.collection.name,
        let: { authorId: '$author' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$authorId'] } } },
          { $project: { username: 1, profilePicture: 1, points: 1, currentStreak: 1 } },
        ],
        as: 'author',
      },
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } }
  );

  if (viewer) {
    pipeline.push(
      // Like status
      {
        $lookup: {
          from: Like.collection.name,
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$post', '$$postId'] }, { $eq: ['$user', viewer._id] }] } } },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
          as: 'viewerLike',
        },
      },
      { $addFields: { isLiked: { $gt: [{ $size: '$viewerLike' }, 0] } } },
      // Bookmark status
      {
        $lookup: {
          from: Bookmark.collection.name,
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$post', '$$postId'] }, { $eq: ['$user', viewer._id] }] } } },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
          as: 'viewerBookmark',
        },
      },
      { $addFields: { isBookmarked: { $gt: [{ $size: '$viewerBookmark' }, 0] } } }
    );
  } else {
    pipeline.push({ $addFields: { isLiked: false, isBookmarked: false } });
  }

  pipeline.push({ $project: { likes: 0, viewerLike: 0, viewerBookmark: 0, __v: 0, trendingScore: 0, textScore: 0 } });

  const docs = await Post.aggregate(pipeline);
  return docs.map((doc) => serializePost(doc, viewer));
}

/** Paginated list with metadata. Accepts optional `q` for text-search filtering. */
async function listPosts(match, { sort, page, limit, skip, viewer, q }) {
  // For text-search, countDocuments must also include the $text filter.
  const countMatch = q ? { ...match, $text: { $search: q } } : match;
  const [items, total] = await Promise.all([
    aggregatePosts(match, { sort, skip, limit, viewer, q }),
    Post.countDocuments(countMatch),
  ]);
  return { posts: items, pagination: buildPageMeta(total, page, limit) };
}

// ---------------------------------------------------------------------------

async function createPost(author, { title, content = '', tags = [], attachments = [] }) {
  // If saving fails, the error handler removes the uploaded files from disk.
  const post = await Post.create({ author: author._id, title, content, tags, attachments });

  // Update the author's streak and fetch the serialized post in parallel.
  const { updateStreakOnPost } = require('./streak.service');
  const [[serialized]] = await Promise.all([
    aggregatePosts({ _id: post._id }, { limit: 1, viewer: author }),
    updateStreakOnPost(author._id),
  ]);
  return serialized;
}

/**
 * Main feed: published posts only, optional tag filter and optional text search.
 * Accepts `q` to text-search within the feed without a separate endpoint.
 */
async function getFeed({ sort = 'newest', tag, q, page, limit, skip, viewer }) {
  const match = { status: 'published' };
  if (tag) match.tags = tag;
  return listPosts(match, { sort, page, limit, skip, viewer, q });
}

/** Single post. Non-published posts are only visible to their author and admins. */
async function getPostById(postId, viewer) {
  const [post] = await aggregatePosts({ _id: new mongoose.Types.ObjectId(postId) }, { limit: 1, viewer });
  if (!post) throw ApiError.notFound('Post not found');

  const canSeeHidden = isAdmin(viewer) || post.isOwner;
  if (post.status !== 'published' && !canSeeHidden) throw ApiError.notFound('Post not found');

  return post;
}

/** Posts by a user. The owner and admins also see their non-published posts. */
async function getPostsByUser(user, { sort = 'newest', page, limit, skip, viewer }) {
  const match = { author: user._id };
  const canSeeHidden = isAdmin(viewer) || (viewer && isSameId(viewer._id, user._id));
  if (!canSeeHidden) match.status = 'published';
  return listPosts(match, { sort, page, limit, skip, viewer });
}

/** Deletes a post. Only the author or an admin may do this. */
async function deletePost(postId, requester) {
  const post = await Post.findById(postId).select('author attachments');
  if (!post) throw ApiError.notFound('Post not found');

  if (!isSameId(post.author, requester._id) && !isAdmin(requester)) {
    throw ApiError.forbidden('You can only delete your own posts');
  }

  await post.deleteOne();
  // Lazy-require to avoid the circular dependency: post.service ↔ bookmark.service.
  const { deleteBookmarksForPost } = require('./bookmark.service');
  const { deleteSharesForPost } = require('./share.service');
  await Promise.all([
    deleteLikesForPost(post._id),
    deleteCommentsForPost(post._id),
    deleteBookmarksForPost(post._id),
    deleteSharesForPost(post._id),
  ]);
  // Remove any locally stored attachment files (external URLs are ignored).
  await Promise.all(post.attachments.map((a) => deleteLocalUpload(a.url)));

  return { _id: post._id };
}

module.exports = {
  serializePost,
  aggregatePosts,
  createPost,
  getFeed,
  getPostById,
  getPostsByUser,
  deletePost,
  TRENDING_GRAVITY,
};
