/**
 * Comment routes — nested under /api/posts/:postId/comments
 *
 * POST   /api/posts/:postId/comments                           add comment
 * GET    /api/posts/:postId/comments                           list comments
 * DELETE /api/posts/:postId/comments/:commentId                delete comment
 * POST   /api/posts/:postId/comments/:commentId/replies        add reply
 * GET    /api/posts/:postId/comments/:commentId/replies        list replies
 */
const { Router } = require('express');
const ctrl = require('../controllers/comment.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUploader, POST_ATTACHMENT_EXTENSIONS } = require('../middleware/upload');
const { COMMENT_LIMITS } = require('../models/Comment');
const {
  postIdParam,
  commentIdParam,
  createCommentRules,
  paginationQueryRules,
} = require('../validators/comment.validators');

const router = Router({ mergeParams: true }); // mergeParams gives us :postId from parent router

/**
 * Comment attachments: same type whitelist as posts, smaller per-request cap.
 * Runs AFTER `protect` so unauthenticated requests never write files to disk.
 */
const commentAttachmentUpload = createUploader({
  subdir: 'comments',
  allowedExtensions: POST_ATTACHMENT_EXTENSIONS,
  maxFiles: COMMENT_LIMITS.maxAttachments,
  maxTotalSizeMB: 30,
});

// Top-level comment routes
router
  .route('/')
  .get(optionalAuth, validate([postIdParam, ...paginationQueryRules]), ctrl.getComments)
  .post(
    protect,
    commentAttachmentUpload.array('attachments'),
    validate([postIdParam, ...createCommentRules]),
    ctrl.addComment
  );

// Single-comment routes (delete)
router
  .route('/:commentId')
  .delete(protect, validate([postIdParam, commentIdParam]), ctrl.deleteComment);

// Reply routes
router
  .route('/:commentId/replies')
  .get(
    optionalAuth,
    validate([postIdParam, commentIdParam, ...paginationQueryRules]),
    ctrl.getReplies
  )
  .post(
    protect,
    commentAttachmentUpload.array('attachments'),
    validate([postIdParam, commentIdParam, ...createCommentRules]),
    ctrl.addReply
  );

module.exports = router;
