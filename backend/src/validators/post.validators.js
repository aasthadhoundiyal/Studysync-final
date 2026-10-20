/**
 * Request validation rules for post endpoints.
 */
const { body, query } = require('express-validator');
const { onlyAllowedFields, mongoIdParam, paginationQueryRules } = require('./common');
const { POST_LIMITS } = require('../models/Post');

// Lowercase letters/numbers plus a few symbols common in tech topics (c++, c#, node.js, machine-learning)
const TAG_PATTERN = /^[a-z0-9][a-z0-9+#._-]*$/;
const FEED_SORTS = ['newest', 'oldest', 'trending'];

/** "#DFS, graphs  algorithms" | ["#DFS", "graphs"] -> ["dfs", "graphs", "algorithms"] (deduped). */
function normalizeTags(value) {
  if (value === undefined || value === null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(/[,\s]+/);
  const tags = raw
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim().replace(/^#+/, '').toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Normalizes a single tag from a query string. */
const normalizeTag = (value) => (typeof value === 'string' ? value.trim().replace(/^#+/, '').toLowerCase() : value);

// Clients may only send these fields; author/points/likes/etc. are server-controlled.
const CREATE_FIELDS = ['title', 'content', 'tags'];

const createPostRules = [
  onlyAllowedFields(CREATE_FIELDS, { verb: 'set' }),
  body('title')
    .exists({ checkFalsy: true })
    .withMessage('Title is required')
    .bail()
    .isString()
    .withMessage('Title must be a string')
    .bail()
    .trim()
    .isLength({ min: POST_LIMITS.titleMin, max: POST_LIMITS.titleMax })
    .withMessage(`Title must be ${POST_LIMITS.titleMin}-${POST_LIMITS.titleMax} characters`),
  // Content is required for text-only posts; optional when at least one file is attached.
  body('content')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .custom((value, { req }) => {
      const hasFiles = Array.isArray(req.files) && req.files.length > 0;
      if (value === undefined || value === null || value === '') {
        if (!hasFiles) throw new Error('Content is required');
        return true;
      }
      if (typeof value !== 'string') throw new Error('Content must be a string');
      if (value.length > POST_LIMITS.contentMax) {
        throw new Error(`Content must be at most ${POST_LIMITS.contentMax} characters`);
      }
      return true;
    }),
  body('tags')
    .optional()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'string') {
        throw new Error('Tags must be an array of strings or a comma-separated string');
      }
      return true;
    })
    .bail()
    .customSanitizer(normalizeTags)
    .custom((tags) => {
      if (tags.length > POST_LIMITS.maxTags) throw new Error(`A post can have at most ${POST_LIMITS.maxTags} tags`);
      const bad = tags.find((t) => t.length > POST_LIMITS.tagMax || !TAG_PATTERN.test(t));
      if (bad) {
        throw new Error(
          `Invalid tag "${bad}". Tags may contain letters, numbers and + # . _ - (max ${POST_LIMITS.tagMax} chars)`
        );
      }
      return true;
    }),
];

const feedQueryRules = [
  ...paginationQueryRules,
  query('sort')
    .optional()
    .isIn(FEED_SORTS)
    .withMessage(`sort must be one of: ${FEED_SORTS.join(', ')}`),
  query('tag')
    .optional()
    .customSanitizer(normalizeTag)
    .custom((tag) => typeof tag === 'string' && tag.length <= POST_LIMITS.tagMax && TAG_PATTERN.test(tag))
    .withMessage('Invalid tag'),
  // Optional free-text search query for the feed (same index as /search/posts)
  query('q')
    .optional()
    .isString()
    .withMessage('q must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('q must be 1–200 characters'),
];

const postIdRules = [mongoIdParam('id', 'post ID')];

module.exports = { createPostRules, feedQueryRules, postIdRules, normalizeTag, FEED_SORTS };
