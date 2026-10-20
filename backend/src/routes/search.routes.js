/**
 * Search routes.
 *
 * All endpoints are read-only (GET) and use optionalAuth so that:
 *   - Authenticated users get viewer-specific flags (isLiked, isBookmarked, isOwner)
 *   - Unauthenticated users can still search
 *   - The sort/filter logic is computed server-side; clients cannot manipulate it
 */
const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/search.controller');
const { searchQueryRules } = require('../validators/search.validators');

const router = Router();

// All search routes share the same validator set (extra params are ignored per route)
router.get('/', optionalAuth, validate(searchQueryRules), ctrl.search);
router.get('/posts', optionalAuth, validate(searchQueryRules), ctrl.searchPostsHandler);
router.get('/users', optionalAuth, validate(searchQueryRules), ctrl.searchUsersHandler);
router.get('/tags', optionalAuth, validate(searchQueryRules), ctrl.searchTagsHandler);

module.exports = router;
