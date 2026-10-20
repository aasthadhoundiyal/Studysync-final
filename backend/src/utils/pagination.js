/**
 * Pagination helpers.
 * Note: in Express 5 `req.query` is re-parsed on access, so values are parsed here
 * instead of relying on validator sanitizers mutating req.query.
 */
function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function buildPageMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasMore: page < totalPages };
}

module.exports = { parsePagination, buildPageMeta };
