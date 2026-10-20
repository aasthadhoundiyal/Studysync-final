/**
 * Validators for admin endpoints.
 */
'use strict';

const { body, query } = require('express-validator');
const { mongoIdParam, paginationQueryRules } = require('./common');

/** Any endpoint that acts on a single post by :id. */
const postIdRules = [mongoIdParam('id', 'post ID')];

/** Any endpoint that acts on a single comment by :id. */
const commentIdRules = [mongoIdParam('id', 'comment ID')];

/** Any endpoint that acts on a single user by :id. */
const userIdRules = [mongoIdParam('id', 'user ID')];

/** Optional reason body field — shared by approve / remove / restore. */
const reasonRule = body('reason')
  .optional()
  .isString()
  .withMessage('reason must be a string')
  .trim()
  .isLength({ max: 500 })
  .withMessage('reason must be at most 500 characters');

/** Pagination + optional contentType filter for the history endpoint. */
const historyQueryRules = [
  ...paginationQueryRules,
  query('contentType')
    .optional()
    .isIn(['post', 'comment'])
    .withMessage('contentType must be "post" or "comment"'),
];

/** Pagination + optional search for the users list. */
const usersQueryRules = [
  ...paginationQueryRules,
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must be at most 100 characters'),
];

module.exports = {
  postIdRules,
  commentIdRules,
  userIdRules,
  reasonRule,
  historyQueryRules,
  usersQueryRules,
};
