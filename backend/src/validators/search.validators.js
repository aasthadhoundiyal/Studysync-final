/**
 * Request validation rules for the search endpoint.
 */
const { query } = require('express-validator');
const { paginationQueryRules } = require('./common');
const { POST_LIMITS } = require('../models/Post');

const SEARCH_TYPES = ['posts', 'users', 'tags', 'all'];
const SEARCH_SORTS = ['newest', 'oldest', 'trending', 'relevance'];
const MAX_Q_LENGTH = 200;

/** Normalizes a single tag from a query string — same logic as post.validators. */
const normalizeTagParam = (value) =>
  typeof value === 'string' ? value.trim().replace(/^#+/, '').toLowerCase() : value;

const TAG_PATTERN = /^[a-z0-9][a-z0-9+#._-]*$/;

const searchQueryRules = [
  ...paginationQueryRules,

  // q is optional — if absent, endpoints return results without text filtering
  // (e.g. /search/tags with no q returns top tags by post count).
  query('q')
    .optional()
    .isString()
    .withMessage('q must be a string')
    .bail()
    .trim()
    .isLength({ max: MAX_Q_LENGTH })
    .withMessage(`q must be at most ${MAX_Q_LENGTH} characters`),

  query('type')
    .optional()
    .isIn(SEARCH_TYPES)
    .withMessage(`type must be one of: ${SEARCH_TYPES.join(', ')}`),

  query('sort')
    .optional()
    .isIn(SEARCH_SORTS)
    .withMessage(`sort must be one of: ${SEARCH_SORTS.join(', ')}`),

  // Optional tag filter applied alongside post search
  query('tag')
    .optional()
    .customSanitizer(normalizeTagParam)
    .custom((tag) =>
      typeof tag === 'string' && tag.length <= POST_LIMITS.tagMax && TAG_PATTERN.test(tag)
    )
    .withMessage('Invalid tag'),
];

module.exports = { searchQueryRules, SEARCH_TYPES, SEARCH_SORTS };
