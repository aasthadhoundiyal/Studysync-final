/**
 * Bookmark routes.
 *
 * Post-scoped routes (mounted at /api/posts):
 *   GET    /api/posts/:id/bookmark        check bookmark status (token optional)
 *   POST   /api/posts/:id/bookmark        save / bookmark a post (auth required)
 *   DELETE /api/posts/:id/bookmark        remove bookmark (auth required)
 *
 * User-scoped route (mounted at /api/users):
 *   GET    /api/users/me/bookmarks        list own saved posts (auth required)
 */
const { Router } = require('express');
const ctrl = require('../controllers/bookmark.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParam, paginationQueryRules } = require('../validators/common');
const { onlyAllowedFields } = require('../validators/common');

// ── Post-scoped router (mergeParams gives us :id from /api/posts/:id) ─────
const postBookmarkRouter = Router({ mergeParams: true });

const postIdRules = [
  mongoIdParam('id', 'post ID'),
  onlyAllowedFields([], { requireOne: false, verb: 'set' }), // reject all body fields
];

postBookmarkRouter.get('/', optionalAuth, validate([mongoIdParam('id', 'post ID')]), ctrl.getBookmarkStatus);
postBookmarkRouter.post('/', protect, validate(postIdRules), ctrl.savePost);
postBookmarkRouter.delete('/', protect, validate([mongoIdParam('id', 'post ID')]), ctrl.unsavePost);

// ── User-scoped router (saved posts list) ─────────────────────────────────
const userBookmarkRouter = Router();

userBookmarkRouter.get(
  '/me/bookmarks',
  protect,
  validate(paginationQueryRules),
  ctrl.getSavedPosts
);

module.exports = { postBookmarkRouter, userBookmarkRouter };
