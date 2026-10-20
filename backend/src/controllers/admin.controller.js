/**
 * Admin controller — thin HTTP layer over admin.service.
 * All routes are protected by protect + authorize('admin').
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const { parsePagination } = require('../utils/pagination');

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json({ success: true, stats });
});

// ---------------------------------------------------------------------------
// Content queues
// ---------------------------------------------------------------------------

/** GET /api/admin/posts/pending */
const getPendingPosts = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await adminService.getPostsByStatus('pending_review', pg);
  res.json({ success: true, ...result });
});

/** GET /api/admin/posts/removed */
const getRemovedPosts = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await adminService.getPostsByStatus('removed', pg);
  res.json({ success: true, ...result });
});

/** GET /api/admin/comments/pending */
const getPendingComments = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await adminService.getCommentsByStatus('pending_review', pg);
  res.json({ success: true, ...result });
});

/** GET /api/admin/comments/removed */
const getRemovedComments = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await adminService.getCommentsByStatus('removed', pg);
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// Moderation history
// ---------------------------------------------------------------------------

/** GET /api/admin/moderation/history */
const getModerationHistory = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const contentType = ['post', 'comment'].includes(req.query.contentType) ? req.query.contentType : null;
  const result = await adminService.getModerationHistory({ ...pg, contentType });
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// Post moderation actions
// ---------------------------------------------------------------------------

/** POST /api/admin/posts/:id/approve */
const approvePost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await adminService.approvePost(req.params.id, req.user, { reason });
  res.json({ success: true, post: result });
});

/** POST /api/admin/posts/:id/remove */
const removePost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await adminService.removePost(req.params.id, req.user, { reason });
  res.json({ success: true, post: result });
});

/** POST /api/admin/posts/:id/restore */
const restorePost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await adminService.restorePost(req.params.id, req.user, { reason });
  res.json({ success: true, post: result });
});

// ---------------------------------------------------------------------------
// Comment moderation actions
// ---------------------------------------------------------------------------

/** POST /api/admin/comments/:id/remove */
const removeComment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await adminService.removeComment(req.params.id, req.user, { reason });
  res.json({ success: true, comment: result });
});

/** POST /api/admin/comments/:id/restore */
const restoreComment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await adminService.restoreComment(req.params.id, req.user, { reason });
  res.json({ success: true, comment: result });
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/** GET /api/admin/users */
const listUsers = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const result = await adminService.listUsers({ ...pg, search });
  res.json({ success: true, ...result });
});

/** POST /api/admin/users/:id/suspend */
const suspendUser = asyncHandler(async (req, res) => {
  const result = await adminService.suspendUser(req.params.id, req.user);
  res.json({ success: true, user: result });
});

/** POST /api/admin/users/:id/reactivate */
const reactivateUser = asyncHandler(async (req, res) => {
  const result = await adminService.reactivateUser(req.params.id, req.user);
  res.json({ success: true, user: result });
});

module.exports = {
  getDashboardStats,
  getPendingPosts,
  getRemovedPosts,
  getPendingComments,
  getRemovedComments,
  getModerationHistory,
  approvePost,
  removePost,
  restorePost,
  removeComment,
  restoreComment,
  listUsers,
  suspendUser,
  reactivateUser,
};
