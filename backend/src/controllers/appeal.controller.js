/**
 * Appeal controller — thin HTTP layer over appeal.service.
 *
 * User routes (protect only):
 *   POST /api/appeals            — submit an appeal
 *   GET  /api/appeals/me         — list my appeals
 *
 * Admin routes (protect + authorize(admin)) — mounted on admin router:
 *   GET  /api/admin/appeals              — all appeals (filterable by status)
 *   GET  /api/admin/appeals/pending      — pending-only shortcut
 *   GET  /api/admin/appeals/:id          — single appeal detail
 *   POST /api/admin/appeals/:id/approve  — approve an appeal
 *   POST /api/admin/appeals/:id/reject   — reject an appeal
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const appealService = require('../services/appeal.service');
const { parsePagination } = require('../utils/pagination');

// ---------------------------------------------------------------------------
// User endpoints
// ---------------------------------------------------------------------------

/** POST /api/appeals  — submit a new appeal. */
const submitAppeal = asyncHandler(async (req, res) => {
  const { contentType, contentId, reason } = req.body;
  const appeal = await appealService.submitAppeal(req.user, contentType, contentId, reason);
  res.status(201).json({ success: true, appeal });
});

/** GET /api/appeals/me  — list authenticated user's own appeals. */
const getMyAppeals = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const result = await appealService.getMyAppeals(req.user, pg);
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

/** GET /api/admin/appeals/pending */
const getPendingAppeals = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await appealService.getPendingAppeals(pg);
  res.json({ success: true, ...result });
});

/** GET /api/admin/appeals  — all appeals with optional ?status= filter */
const getAllAppeals = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const validStatuses = ['pending', 'approved', 'rejected'];
  const status = validStatuses.includes(req.query.status) ? req.query.status : null;
  const result = await appealService.getAllAppeals({ ...pg, status });
  res.json({ success: true, ...result });
});

/** GET /api/admin/appeals/:appealId  — single appeal detail */
const getAppealById = asyncHandler(async (req, res) => {
  const appeal = await appealService.getAppealById(req.params.appealId);
  res.json({ success: true, appeal });
});

/** POST /api/admin/appeals/:appealId/approve */
const approveAppeal = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;
  const result = await appealService.reviewAppeal(req.params.appealId, req.user, {
    decision: 'approved',
    adminNote,
  });
  res.json({ success: true, appeal: result });
});

/** POST /api/admin/appeals/:appealId/reject */
const rejectAppeal = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;
  const result = await appealService.reviewAppeal(req.params.appealId, req.user, {
    decision: 'rejected',
    adminNote,
  });
  res.json({ success: true, appeal: result });
});

module.exports = {
  submitAppeal,
  getMyAppeals,
  getPendingAppeals,
  getAllAppeals,
  getAppealById,
  approveAppeal,
  rejectAppeal,
};
