/**
 * Admin routes — all endpoints require protect + authorize('admin').
 *
 * Dashboard
 *   GET  /api/admin/stats
 *
 * Content queues
 *   GET  /api/admin/posts/pending
 *   GET  /api/admin/posts/removed
 *   GET  /api/admin/comments/pending
 *   GET  /api/admin/comments/removed
 *
 * Moderation history
 *   GET  /api/admin/moderation/history
 *
 * Post actions
 *   POST /api/admin/posts/:id/approve
 *   POST /api/admin/posts/:id/remove
 *   POST /api/admin/posts/:id/restore
 *
 * Comment actions
 *   POST /api/admin/comments/:id/remove
 *   POST /api/admin/comments/:id/restore
 *
 * User management
 *   GET  /api/admin/users
 *   POST /api/admin/users/:id/suspend
 *   POST /api/admin/users/:id/reactivate
 */
'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const appealCtrl = require('../controllers/appeal.controller');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  postIdRules,
  commentIdRules,
  userIdRules,
  reasonRule,
  historyQueryRules,
  usersQueryRules,
} = require('../validators/admin.validators');
const { appealIdRules, reviewAppealRules, listAppealsQueryRules } = require('../validators/appeal.validators');

const router = Router();

// Apply protect + authorize to every route in this router.
router.use(protect, authorize('admin'));

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/stats', ctrl.getDashboardStats);

// ---------------------------------------------------------------------------
// Content queues
// IMPORTANT: static segments (/pending, /removed) are declared BEFORE /:id/*
// so they are never captured by the param wildcard.
// ---------------------------------------------------------------------------
router.get('/posts/pending', ctrl.getPendingPosts);
router.get('/posts/removed', ctrl.getRemovedPosts);
router.get('/comments/pending', ctrl.getPendingComments);
router.get('/comments/removed', ctrl.getRemovedComments);

// ---------------------------------------------------------------------------
// Moderation history
// ---------------------------------------------------------------------------
router.get('/moderation/history', validate(historyQueryRules), ctrl.getModerationHistory);

// ---------------------------------------------------------------------------
// Post actions
// ---------------------------------------------------------------------------
router.post('/posts/:id/approve', validate([...postIdRules, reasonRule]), ctrl.approvePost);
router.post('/posts/:id/remove',  validate([...postIdRules, reasonRule]), ctrl.removePost);
router.post('/posts/:id/restore', validate([...postIdRules, reasonRule]), ctrl.restorePost);

// ---------------------------------------------------------------------------
// Comment actions
// ---------------------------------------------------------------------------
router.post('/comments/:id/remove',  validate([...commentIdRules, reasonRule]), ctrl.removeComment);
router.post('/comments/:id/restore', validate([...commentIdRules, reasonRule]), ctrl.restoreComment);

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------
router.get('/users', validate(usersQueryRules), ctrl.listUsers);
router.post('/users/:id/suspend',    validate(userIdRules), ctrl.suspendUser);
router.post('/users/:id/reactivate', validate(userIdRules), ctrl.reactivateUser);

// ---------------------------------------------------------------------------
// Appeals (admin review queue)
// Static paths (/pending, /all) declared BEFORE /:appealId to avoid capture.
// ---------------------------------------------------------------------------
router.get('/appeals/pending', validate(listAppealsQueryRules), appealCtrl.getPendingAppeals);
router.get('/appeals',         validate(listAppealsQueryRules), appealCtrl.getAllAppeals);
router.get('/appeals/:appealId', validate(appealIdRules),       appealCtrl.getAppealById);
router.post('/appeals/:appealId/approve', validate(reviewAppealRules), appealCtrl.approveAppeal);
router.post('/appeals/:appealId/reject',  validate(reviewAppealRules), appealCtrl.rejectAppeal);

module.exports = router;
