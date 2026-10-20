/**
 * Validators for appeal endpoints.
 */
'use strict';

const { body, param, query } = require('express-validator');
const { mongoIdParam, paginationQueryRules } = require('./common');

/** POST /api/appeals — submit an appeal */
const submitAppealRules = [
  body('contentType')
    .isIn(['post', 'comment'])
    .withMessage('contentType must be "post" or "comment"'),
  body('contentId')
    .isMongoId()
    .withMessage('contentId must be a valid MongoDB ObjectId'),
  body('reason')
    .isString()
    .withMessage('reason must be a string')
    .bail()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('reason must be between 10 and 1000 characters'),
];

/** Any endpoint with :appealId param */
const appealIdRules = [mongoIdParam('appealId', 'appeal ID')];

/** Admin approve / reject — optional adminNote body */
const reviewAppealRules = [
  ...appealIdRules,
  body('adminNote')
    .optional()
    .isString()
    .withMessage('adminNote must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('adminNote must be at most 1000 characters'),
];

/** GET /api/admin/appeals — optional status filter + pagination */
const listAppealsQueryRules = [
  ...paginationQueryRules,
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('status must be pending, approved, or rejected'),
];

module.exports = {
  submitAppealRules,
  appealIdRules,
  reviewAppealRules,
  listAppealsQueryRules,
};
