/**
 * Comment business logic.
 *
 * Architecture overview:
 *   - Comments live in a separate Comment collection (keeps Post documents small).
 *   - Replies are first-level only: replies reference a top-level parentComment.
 *     A reply to a reply is stored as a reply to the original top-level comment (flattened).
 *   - commentsCount on Post is the total of ALL comments + replies (any depth).
 *   - repliesCount on a top-level Comment tracks only its direct replies.
 *   - Soft-delete: the document is kept (content wiped to "[deleted]") so reply threads
 *     stay intact. Hard-delete cascades only when the parent post is deleted.
 *   - Points: each comment awards `pointsAwarded` points to the post's trending score.
 *     These are reversed on hard-delete, but not on soft-delete.
 */
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { deleteLocalUpload } = require('../utils/files');
const { buildPageMeta } = require('../utils/pagination');
const { pointsForEngagement, awardUserPoints, levelInfo } = require('./points.service');
const notificationService = require('./notification.service');

const levelFromPoints = (points) => levelInfo(points).level;

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const isSameId = (a, b) => Boolean(a && b && a.toString() === b.toString());
const isAdmin = (user) => Boolean(user && user.role === 'admin');

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Converts an aggregated comment document into the shape used by the frontend. */
function serializeComment(doc, viewer) {
  // When the comment is soft-deleted we still show a placeholder so reply threads render.
  if (doc.isDeleted) {
    return {
      _id: doc._id,
      post: doc.post,
      parentComment: doc.parentComment || null,
      author: { _id: null, username: '[deleted]', profilePicture: '', level: 1, levelName: 'Beginner' },
      content: '[deleted]',
      attachments: [],
      repliesCount: doc.repliesCount || 0,
      isDeleted: true,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isOwner: false,
      canDelete: false,
      moderationStatus: doc.moderationStatus || 'published',
    };
  }

  const author = doc.author
    ? {
        _id: doc.author._id,
        username: doc.author.username,
        profilePicture: doc.author.profilePicture || '',
        level: levelInfo(doc.author.points).level,
        levelName: levelInfo(doc.author.points).levelName,
        currentStreak: doc.author.currentStreak || 0,
      }
    : { _id: null, username: '[deleted]', profilePicture: '', level: 1, levelName: 'Beginner', currentStreak: 0 };

  const isOwner = Boolean(viewer && doc.author && isSameId(viewer._id, doc.author._id));

  return {
    _id: doc._id,
    post: doc.post,
    parentComment: doc.parentComment || null,
    author,
    content: doc.content || '',
    attachments: (doc.attachments || []).map((a) => ({
      _id: a._id,
      type: a.type,
      url: a.url,
      originalName: a.originalName,
      mimeType: a.mimeType,
      extension: a.extension,
      size: a.size,
    })),
    repliesCount: doc.repliesCount || 0,
    isDeleted: false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    isOwner,
    canDelete: isOwner || isAdmin(viewer),
    moderationStatus: doc.moderationStatus || 'published',
  };
}

// ---------------------------------------------------------------------------
// Shared aggregation pipeline
// ---------------------------------------------------------------------------

/**
 * Runs the shared comment aggregation: match -> sort -> paginate -> join author.
 * Returns serialized comment objects.
 */
async function aggregateComments(match, { skip = 0, limit = 20, viewer = null } = {}) {
  const pipeline = [
    { $match: match },
    { $sort: { createdAt: 1, _id: 1 } }, // oldest first within a thread
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
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
    { $project: { __v: 0, pointsAwarded: 0 } },
  ];

  const docs = await Comment.aggregate(pipeline);
  return docs.map((doc) => serializeComment(doc, viewer));
}

// ---------------------------------------------------------------------------
// Counter helpers
// ---------------------------------------------------------------------------

/** Atomically adjusts commentsCount (and points) on a published post, clamped at 0. */
async function adjustPostCounters(postId, { comments, points }) {
  return Post.findOneAndUpdate(
    { _id: postId, status: 'published' },
    [
      {
        $set: {
          commentsCount: { $max: [0, { $add: [{ $ifNull: ['$commentsCount', 0] }, comments] }] },
          points: { $max: [0, { $add: [{ $ifNull: ['$points', 0] }, points] }] },
        },
      },
    ],
    { returnDocument: 'after', projection: { commentsCount: 1, points: 1 }, updatePipeline: true }
  ).lean();
}

/** Atomically adjusts repliesCount on a top-level comment, clamped at 0. */
async function adjustRepliesCount(commentId, delta) {
  return Comment.findByIdAndUpdate(
    commentId,
    [{ $set: { repliesCount: { $max: [0, { $add: [{ $ifNull: ['$repliesCount', 0] }, delta] }] } } }],
    { returnDocument: 'after', projection: { repliesCount: 1 }, updatePipeline: true }
  ).lean();
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Finds a published post or throws 404. */
async function findCommentablePost(postId) {
  const post = await Post.findOne({ _id: postId, status: 'published' }).select('author commentsCount').lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

/** Finds a non-deleted comment or throws 404. */
async function findLiveComment(commentId, postId) {
  const comment = await Comment.findOne({ _id: commentId, post: postId, isDeleted: false })
    .select('author post parentComment attachments pointsAwarded repliesCount')
    .lean();
  if (!comment) throw ApiError.notFound('Comment not found');
  return comment;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Adds a top-level comment to a post.
 * @returns {object} serialized comment
 */
async function addComment(postId, author, { content = '', attachments = [] }) {
  const pid = toObjectId(postId);
  const post = await findCommentablePost(pid);

  const pointsAwarded = pointsForEngagement('comment', { actorId: author._id, authorId: post.author });

  const comment = await Comment.create({
    post: pid,
    author: author._id,
    content,
    attachments,
    parentComment: null,
    pointsAwarded,
  });

  await Promise.all([
    adjustPostCounters(pid, { comments: 1, points: pointsAwarded }),
    awardUserPoints(post.author, pointsAwarded), // award to the post's author
  ]);

  const [serialized] = await aggregateComments({ _id: comment._id }, { limit: 1, viewer: author });

  // Fire-and-forget: notify the post author about the new comment.
  notificationService
    .notifyComment(pid, comment._id, author._id, post.author, author.username)
    .catch((err) => console.error('[notify] addComment:', err));

  return serialized;
}

/**
 * Adds a reply to an existing top-level comment.
 * Replies-to-replies are stored as replies to the top-level comment (one level of nesting).
 */
async function addReply(postId, parentCommentId, author, { content = '', attachments = [] }) {
  const pid = toObjectId(postId);
  const pcid = toObjectId(parentCommentId);

  const post = await findCommentablePost(pid);

  // Resolve the top-level anchor (if user is replying to a reply, redirect to the root comment).
  const parentComment = await Comment.findOne({ _id: pcid, post: pid })
    .select('parentComment isDeleted')
    .lean();
  if (!parentComment) throw ApiError.notFound('Comment not found');

  const topLevelId = parentComment.parentComment
    ? toObjectId(parentComment.parentComment) // reply-to-reply → anchor at grandparent
    : pcid;

  const pointsAwarded = pointsForEngagement('comment', { actorId: author._id, authorId: post.author });

  const reply = await Comment.create({
    post: pid,
    author: author._id,
    content,
    attachments,
    parentComment: topLevelId,
    pointsAwarded,
  });

  await Promise.all([
    adjustPostCounters(pid, { comments: 1, points: pointsAwarded }),
    adjustRepliesCount(topLevelId, 1),
    awardUserPoints(post.author, pointsAwarded), // award to the post's author
  ]);

  const [serialized] = await aggregateComments({ _id: reply._id }, { limit: 1, viewer: author });

  // Fire-and-forget notifications for the reply:
  //   1. Notify the post author that someone commented (uses type='comment').
  //   2. Notify the top-level comment's author that someone replied (type='reply').
  //      We need the top-level comment's author — fetch it lean.
  ;
  (async () => {
    try {
      // Notify post author about the comment (regardless of who wrote the top-level comment)
      await notificationService.notifyComment(pid, reply._id, author._id, post.author, author.username);

      // Notify the parent comment author about the reply (only if different from post author
      // and different from the replier themselves — self-check is inside notifyReply).
      const parentDoc = await Comment.findById(topLevelId).select('author').lean();
      if (parentDoc && parentDoc.author) {
        await notificationService.notifyReply(
          pid,
          topLevelId,
          reply._id,
          author._id,
          parentDoc.author,
          author.username
        );
      }
    } catch (err) {
      console.error('[notify] addReply:', err);
    }
  })();

  return serialized;
}

/**
 * Returns paginated top-level comments for a post.
 */
async function getComments(postId, { page, limit, skip, viewer }) {
  const pid = toObjectId(postId);
  // Verify post exists (no status check — users may view comments on removed posts if they have the ID)
  const postExists = await Post.exists({ _id: pid });
  if (!postExists) throw ApiError.notFound('Post not found');

  const match = { post: pid, parentComment: null, moderationStatus: { $ne: 'removed' } };
  const [items, total] = await Promise.all([
    aggregateComments(match, { skip, limit, viewer }),
    Comment.countDocuments(match),
  ]);
  return { comments: items, pagination: buildPageMeta(total, page, limit) };
}

/**
 * Returns paginated replies for a single top-level comment.
 */
async function getReplies(postId, commentId, { page, limit, skip, viewer }) {
  const pid = toObjectId(postId);
  const cid = toObjectId(commentId);

  const postExists = await Post.exists({ _id: pid });
  if (!postExists) throw ApiError.notFound('Post not found');

  const parentExists = await Comment.exists({ _id: cid, post: pid, parentComment: null });
  if (!parentExists) throw ApiError.notFound('Comment not found');

  const match = { post: pid, parentComment: cid, moderationStatus: { $ne: 'removed' } };
  const [items, total] = await Promise.all([
    aggregateComments(match, { skip, limit, viewer }),
    Comment.countDocuments(match),
  ]);
  return { replies: items, pagination: buildPageMeta(total, page, limit) };
}

/**
 * Soft-deletes a comment (wipes content, keeps document for thread integrity).
 * Admins and the comment author may delete.
 *
 * Points are NOT reversed on soft-delete — the thread happened and the engagement
 * already benefited the post.  Hard-delete (via deleteCommentsForPost) reverses them.
 */
async function deleteComment(postId, commentId, requester) {
  const pid = toObjectId(postId);
  const cid = toObjectId(commentId);

  const comment = await Comment.findOne({ _id: cid, post: pid }).select(
    'author parentComment isDeleted attachments'
  );
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.isDeleted) throw ApiError.notFound('Comment not found');

  if (!isSameId(comment.author, requester._id) && !isAdmin(requester)) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  // Collect attachment metadata before wiping so we can clean the files off disk.
  const oldAttachments = [...comment.attachments];

  // Read pointsAwarded BEFORE wiping — we need it to reverse user points.
  const pointsToReverse = await Comment.findOne({ _id: cid })
    .select('pointsAwarded post')
    .lean();

  // Wipe content and attachments, mark deleted.
  // Use updateOne with runValidators:false — the content-required validator would
  // reject the empty string even though this is an intentional soft-delete.
  await Comment.updateOne(
    { _id: cid },
    { $set: { content: '', attachments: [], isDeleted: true } },
    { runValidators: false }
  );

  // Clean up stored attachment files.
  await Promise.all(oldAttachments.map((a) => deleteLocalUpload(a.url)));

  // Reverse user points from the post's author (who earned them when this comment was created).
  // We need the post's author — fetch it once.
  const postDoc = await Post.findById(pid).select('author').lean();
  const ops = [
    adjustPostCounters(pid, { comments: -1, points: 0 }),
  ];
  if (postDoc && pointsToReverse && pointsToReverse.pointsAwarded) {
    ops.push(awardUserPoints(postDoc.author, -(pointsToReverse.pointsAwarded)));
  }
  await Promise.all(ops);

  // If this was a reply, decrement the parent's repliesCount.
  if (comment.parentComment) {
    await adjustRepliesCount(comment.parentComment, -1);
  }

  return { _id: cid };
}

/**
 * Hard-deletes all comments for a post (called when the post itself is deleted).
 * Reverses all pointsAwarded from comments and removes attachment files from disk.
 * The author's user-points are bulk-reversed so the totals stay correct.
 */
async function deleteCommentsForPost(postId) {
  const comments = await Comment.find({ post: postId })
    .select('attachments pointsAwarded')
    .lean();

  // Compute total points to reverse for the author (all non-zero, non-deleted comments).
  const totalPointsToReverse = comments.reduce((sum, c) => sum + (c.pointsAwarded || 0), 0);

  await Comment.deleteMany({ post: postId });

  // Remove attachment files.
  const allAttachments = comments.flatMap((c) => c.attachments || []);
  await Promise.all(allAttachments.map((a) => deleteLocalUpload(a.url)));

  // Reverse the author's user-points in one atomic update.
  if (totalPointsToReverse > 0) {
    const postDoc = await Post.findById(postId).select('author').lean();
    if (postDoc) {
      await awardUserPoints(postDoc.author, -totalPointsToReverse);
    }
  }
}

module.exports = {
  addComment,
  addReply,
  getComments,
  getReplies,
  deleteComment,
  deleteCommentsForPost,
};
