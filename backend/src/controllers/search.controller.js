/**
 * Search controller.
 *
 * GET /api/search                    — unified search (all types)
 * GET /api/search/posts              — post search only
 * GET /api/search/users              — user search only
 * GET /api/search/tags               — tag search only
 *
 * Common query params:
 *   q      {string}  Search query (required except for tag browsing without a query)
 *   sort   {string}  newest | oldest | trending | relevance  (default: relevance)
 *   type   {string}  posts | users | tags | all              (unified endpoint only)
 *   tag    {string}  Optional tag filter for post search
 *   page   {number}  Default 1
 *   limit  {number}  Default 10, max 50
 */
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const { searchPosts, searchUsers, searchTags, unifiedSearch, sanitiseQ } = require('../services/search.service');
const { normalizeTag } = require('../validators/post.validators');

// ---------------------------------------------------------------------------
// Unified: GET /api/search?q=&type=all|posts|users|tags&sort=&tag=&page=&limit=
// ---------------------------------------------------------------------------
const search = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = sanitiseQ(req.query.q);
  const type = req.query.type || 'all';
  const sort = req.query.sort || 'relevance';
  const tag = req.query.tag ? normalizeTag(req.query.tag) : undefined;

  const results = await unifiedSearch({ q, type, sort, tag, page, limit, skip, viewer: req.user });
  res.json({ success: true, q, type, sort, tag: tag || null, ...results });
});

// ---------------------------------------------------------------------------
// Posts: GET /api/search/posts?q=&sort=&tag=&page=&limit=
// ---------------------------------------------------------------------------
const searchPostsHandler = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = sanitiseQ(req.query.q);
  const sort = req.query.sort || 'relevance';
  const tag = req.query.tag ? normalizeTag(req.query.tag) : undefined;

  const result = await searchPosts({ q, sort, tag, page, limit, skip, viewer: req.user });
  res.json({ success: true, q, sort, tag: tag || null, ...result });
});

// ---------------------------------------------------------------------------
// Users: GET /api/search/users?q=&page=&limit=
// ---------------------------------------------------------------------------
const searchUsersHandler = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = sanitiseQ(req.query.q);

  const result = await searchUsers({ q, page, limit, skip, viewer: req.user });
  res.json({ success: true, q, ...result });
});

// ---------------------------------------------------------------------------
// Tags: GET /api/search/tags?q=&page=&limit=
// ---------------------------------------------------------------------------
const searchTagsHandler = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = sanitiseQ(req.query.q);

  const result = await searchTags({ q, page, limit, skip });
  res.json({ success: true, q, ...result });
});

module.exports = {
  search,
  searchPostsHandler,
  searchUsersHandler,
  searchTagsHandler,
};
