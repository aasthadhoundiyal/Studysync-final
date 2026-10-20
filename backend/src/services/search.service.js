/**
 * Search service.
 *
 * Three search targets:
 *   posts  — full-text search over title, content and tags (MongoDB $text index)
 *   users  — prefix/substring match on username
 *   tags   — aggregates all distinct tags matching a query string, with post counts
 *
 * All results are paginated using the shared pagination helpers.
 */
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const { buildPageMeta } = require('../utils/pagination');
const { serializePost, TRENDING_GRAVITY } = require('./post.service');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Sanitises a raw query string: trims, collapses whitespace, max 200 chars. */
function sanitiseQ(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// Post search
// ---------------------------------------------------------------------------

/**
 * Searches published posts using the MongoDB full-text index on (title, content, tags).
 * Falls back to a regex match on title if the $text operator fails for any reason.
 *
 * Supported sort values: newest | oldest | trending | relevance (default when q is given)
 *
 * @param {object} opts
 * @param {string}  opts.q        Search query (required)
 * @param {string}  [opts.sort]   One of newest|oldest|trending|relevance
 * @param {string}  [opts.tag]    Optional tag filter applied alongside text search
 * @param {number}  opts.page
 * @param {number}  opts.limit
 * @param {number}  opts.skip
 * @param {object}  [opts.viewer] Authenticated user (for isLiked / isBookmarked flags)
 */
async function searchPosts({ q, sort = 'relevance', tag, page, limit, skip, viewer }) {
  const query = sanitiseQ(q);
  if (!query) return { posts: [], pagination: buildPageMeta(0, page, limit) };

  // Build match stage — text search + published status + optional tag filter
  const match = {
    $text: { $search: query },
    status: 'published',
  };
  if (tag) match.tags = tag;

  // Build the aggregation pipeline
  const pipeline = [{ $match: match }];

  // Add textScore for relevance sorting
  pipeline.push({ $addFields: { textScore: { $meta: 'textScore' } } });

  // Add trendingScore if needed
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

  // Sort stage
  const sortStage = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    trending: { trendingScore: -1, createdAt: -1, _id: -1 },
    relevance: { textScore: -1, createdAt: -1, _id: -1 },
  }[sort] || { textScore: -1, createdAt: -1, _id: -1 };

  pipeline.push({ $sort: sortStage });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Join author
  pipeline.push(
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

  // Viewer-specific like/bookmark flags
  if (viewer) {
    pipeline.push(
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

  // Strip internal fields
  pipeline.push({ $project: { viewerLike: 0, viewerBookmark: 0, __v: 0, trendingScore: 0, textScore: 0 } });

  // Count and fetch in parallel
  const [docs, total] = await Promise.all([
    Post.aggregate(pipeline),
    Post.countDocuments(match),
  ]);

  return {
    posts: docs.map((doc) => serializePost(doc, viewer)),
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// User search
// ---------------------------------------------------------------------------

/**
 * Serialises a user document to a safe public shape.
 * Deliberately minimal — just the fields needed for a user-search result card.
 */
function serializeUserResult(doc) {
  const { levelInfo } = require('./points.service');
  const li = levelInfo(doc.points || 0);
  return {
    _id: doc._id,
    username: doc.username,
    profilePicture: doc.profilePicture || '',
    bio: doc.bio || '',
    points: doc.points || 0,
    level: li.level,
    levelName: li.levelName,
    currentStreak: doc.currentStreak || 0,
  };
}

/**
 * Searches users by username prefix/substring (case-insensitive).
 * Suspended users are excluded unless the caller is an admin.
 *
 * @param {object} opts
 * @param {string}  opts.q      Search query
 * @param {number}  opts.page
 * @param {number}  opts.limit
 * @param {number}  opts.skip
 * @param {object}  [opts.viewer]
 */
async function searchUsers({ q, page, limit, skip, viewer }) {
  const query = sanitiseQ(q);
  if (!query) return { users: [], pagination: buildPageMeta(0, page, limit) };

  // Escape regex special chars from the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const baseFilter = { username: regex };
  // Hide suspended accounts from non-admins
  if (!viewer || viewer.role !== 'admin') {
    baseFilter.isSuspended = { $ne: true };
  }

  const [docs, total] = await Promise.all([
    User.find(baseFilter)
      .select('username profilePicture bio points currentStreak')
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(baseFilter),
  ]);

  return {
    users: docs.map(serializeUserResult),
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// Tag search
// ---------------------------------------------------------------------------

/**
 * Returns all distinct tags whose name contains the query string,
 * ordered by the number of published posts that carry that tag (descending).
 *
 * @param {object} opts
 * @param {string}  opts.q     Query substring (optional — if empty, returns top tags)
 * @param {number}  opts.page
 * @param {number}  opts.limit
 * @param {number}  opts.skip
 */
async function searchTags({ q, page, limit, skip }) {
  const query = sanitiseQ(q);

  // Build the aggregation pipeline
  const pipeline = [
    // Only published posts
    { $match: { status: 'published', 'tags.0': { $exists: true } } },
    // Unwind into one doc per tag
    { $unwind: '$tags' },
  ];

  // Filter by query substring if provided
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pipeline.push({ $match: { tags: new RegExp(escaped, 'i') } });
  }

  // Count posts per tag
  pipeline.push(
    { $group: { _id: '$tags', postCount: { $sum: 1 } } },
    { $sort: { postCount: -1, _id: 1 } }
  );

  // Facet for total count + paginated slice in one query
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: 'count' }],
    },
  });

  const [result] = await Post.aggregate(pipeline);
  const tags = (result?.data || []).map((d) => ({ tag: d._id, postCount: d.postCount }));
  const total = result?.totalCount?.[0]?.count || 0;

  return {
    tags,
    pagination: buildPageMeta(total, page, limit),
  };
}

// ---------------------------------------------------------------------------
// Unified search (all three in one call)
// ---------------------------------------------------------------------------

/**
 * Runs post, user and tag searches and merges results.
 * Returns one flat object with keys based on `type`:
 *   { posts, postsPagination, users, usersPagination, tags, tagsPagination }
 * Only the keys relevant to the requested type are present.
 *
 * @param {object} opts
 * @param {string}  opts.q
 * @param {string}  [opts.type]   'posts'|'users'|'tags'|'all' (default 'all')
 * @param {string}  [opts.sort]   For post results
 * @param {number}  opts.page
 * @param {number}  opts.limit
 * @param {number}  opts.skip
 * @param {object}  [opts.viewer]
 */
async function unifiedSearch({ q, type = 'all', sort = 'relevance', page, limit, skip, viewer }) {
  const wantPosts = type === 'all' || type === 'posts';
  const wantUsers = type === 'all' || type === 'users';
  const wantTags  = type === 'all' || type === 'tags';

  const [postsResult, usersResult, tagsResult] = await Promise.all([
    wantPosts ? searchPosts({ q, sort, page, limit, skip, viewer }) : null,
    wantUsers ? searchUsers({ q, page, limit, skip, viewer }) : null,
    wantTags  ? searchTags({ q, page, limit, skip }) : null,
  ]);

  const merged = {};
  if (postsResult) {
    merged.posts = postsResult.posts;
    merged.postsPagination = postsResult.pagination;
  }
  if (usersResult) {
    merged.users = usersResult.users;
    merged.usersPagination = usersResult.pagination;
  }
  if (tagsResult) {
    merged.tags = tagsResult.tags;
    merged.tagsPagination = tagsResult.pagination;
  }
  return merged;
}

module.exports = {
  searchPosts,
  searchUsers,
  searchTags,
  unifiedSearch,
  sanitiseQ,
  TRENDING_GRAVITY,
};
