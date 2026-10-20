/**
 * Comment controller — thin layer between Express and comment.service.
 */
const asyncHandler = require('../utils/asyncHandler');
const commentService = require('../services/comment.service');
const { parsePagination } = require('../utils/pagination');
const { toAttachment } = require('../middleware/upload');

/**
 * POST /api/posts/:postId/comments
 * Body: application/json { content? } or multipart/form-data with optional "attachments" files.
 */
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const attachments = (req.files || []).map(toAttachment);
  const comment = await commentService.addComment(req.params.postId, req.user, { content, attachments });
  res.status(201).json({ success: true, message: 'Comment added', comment });
});

/**
 * GET /api/posts/:postId/comments?page=&limit=
 * Returns paginated top-level comments for a post (oldest first).
 */
const getComments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const result = await commentService.getComments(req.params.postId, { page, limit, skip, viewer: req.user });
  res.json({ success: true, ...result });
});

/**
 * POST /api/posts/:postId/comments/:commentId/replies
 * Body: same as addComment.
 */
const addReply = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const attachments = (req.files || []).map(toAttachment);
  const reply = await commentService.addReply(
    req.params.postId,
    req.params.commentId,
    req.user,
    { content, attachments }
  );
  res.status(201).json({ success: true, message: 'Reply added', comment: reply });
});

/**
 * GET /api/posts/:postId/comments/:commentId/replies?page=&limit=
 * Returns paginated replies for a single top-level comment.
 */
const getReplies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const result = await commentService.getReplies(req.params.postId, req.params.commentId, {
    page,
    limit,
    skip,
    viewer: req.user,
  });
  res.json({ success: true, ...result });
});

/**
 * DELETE /api/posts/:postId/comments/:commentId
 * Soft-deletes. The comment owner and admins may delete.
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { _id } = await commentService.deleteComment(req.params.postId, req.params.commentId, req.user);
  res.json({ success: true, message: 'Comment deleted', commentId: _id });
});

module.exports = { addComment, getComments, addReply, getReplies, deleteComment };
