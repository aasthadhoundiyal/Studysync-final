/**
 * Bookmark controller — thin layer between Express and bookmark.service.
 */
const asyncHandler = require('../utils/asyncHandler');
const bookmarkService = require('../services/bookmark.service');
const { parsePagination } = require('../utils/pagination');

/**
 * POST /api/posts/:postId/bookmark
 * Saves (bookmarks) the post for the current user.
 */
const savePost = asyncHandler(async (req, res) => {
  const r = await bookmarkService.savePost(req.params.id, req.user);
  res.status(200).json({ success: true, message: r.alreadySaved ? 'Post already saved' : 'Post saved', ...r });
});

/**
 * DELETE /api/posts/:postId/bookmark
 * Removes the bookmark for the current user.
 */
const unsavePost = asyncHandler(async (req, res) => {
  const r = await bookmarkService.unsavePost(req.params.id, req.user);
  res.json({ success: true, message: 'Bookmark removed', ...r });
});

/**
 * GET /api/posts/:postId/bookmark
 * Returns the bookmark status for the requesting user.
 * Token is optional — anonymous viewers always receive saved: false.
 */
const getBookmarkStatus = asyncHandler(async (req, res) => {
  const r = await bookmarkService.getBookmarkStatus(req.params.id, req.user);
  res.json({ success: true, ...r });
});

/**
 * GET /api/users/me/bookmarks?page=&limit=
 * Returns the authenticated user's saved posts (full post cards, newest save first).
 */
const getSavedPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const result = await bookmarkService.getSavedPosts(req.user, { page, limit, skip, viewer: req.user });
  res.json({ success: true, ...result });
});

module.exports = { savePost, unsavePost, getBookmarkStatus, getSavedPosts };
