/**
 * Request validation rules for comment endpoints.
 */
const { body, param } = require('express-validator');
const { mongoIdParam, onlyAllowedFields, paginationQueryRules } = require('./common');
const { COMMENT_LIMITS } = require('../models/Comment');

/** Validates :postId route param. */
const postIdParam = mongoIdParam('postId', 'post ID');

/** Validates :commentId route param. */
const commentIdParam = mongoIdParam('commentId', 'comment ID');

/** Fields the client may send in the comment body. */
const COMMENT_WRITE_FIELDS = ['content'];

/**
 * Rules for creating a comment or reply.
 * Content is required unless at least one file is attached.
 */
const createCommentRules = [
  onlyAllowedFields(COMMENT_WRITE_FIELDS, { requireOne: false, verb: 'set' }),
  body('content')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .custom((value, { req }) => {
      const hasFiles = Array.isArray(req.files) && req.files.length > 0;

      if (value === undefined || value === null || value === '') {
        if (!hasFiles) throw new Error('Comment content is required');
        return true;
      }

      if (typeof value !== 'string') throw new Error('Content must be a string');

      if (value.length > COMMENT_LIMITS.contentMax) {
        throw new Error(`Comment must be at most ${COMMENT_LIMITS.contentMax} characters`);
      }

      return true;
    }),
];

module.exports = {
  postIdParam,
  commentIdParam,
  createCommentRules,
  paginationQueryRules,
};
