/**
 * Reusable validation rule builders shared across validators.
 */
const { body, param, query } = require('express-validator');
const { RESERVED_USERNAMES } = require('../models/User');

/** Username: 3-30 chars, lowercase letters/numbers/underscores/dots, not reserved. */
const usernameRule = (field = 'username', { optional = false } = {}) => {
  let chain = body(field);
  chain = optional
    ? chain.optional()
    : chain.exists({ checkFalsy: true }).withMessage('Username is required').bail();
  return chain
    .isString()
    .withMessage('Username must be a string')
    .bail()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-z0-9_.]+$/)
    .withMessage('Username may only contain letters, numbers, underscores and dots')
    .not()
    .isIn(RESERVED_USERNAMES)
    .withMessage('This username is reserved');
};

/** Bio: optional string up to 300 chars ('' clears it). */
const bioRule = (field = 'bio', { optional = true } = {}) => {
  let chain = body(field);
  chain = optional ? chain.optional() : chain.exists().withMessage('Bio is required').bail();
  return chain
    .isString()
    .withMessage('Bio must be a string')
    .bail()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Bio must be at most 300 characters');
};

/**
 * Rejects body fields the client is not allowed to set (points, role, author, ...).
 * By default also requires at least one allowed field to be present.
 */
const onlyAllowedFields = (allowed, { requireOne = true, verb = 'updated' } = {}) =>
  body().custom((value) => {
    const payload = value && typeof value === 'object' ? value : {};
    const disallowed = Object.keys(payload).filter((key) => !allowed.includes(key));
    if (disallowed.length) throw new Error(`These fields cannot be ${verb}: ${disallowed.join(', ')}`);
    if (requireOne && !Object.keys(payload).some((key) => allowed.includes(key))) {
      throw new Error(`Provide at least one of: ${allowed.join(', ')}`);
    }
    return true;
  });

/** Route param that must be a MongoDB ObjectId. */
const mongoIdParam = (name = 'id', label = 'ID') => param(name).isMongoId().withMessage(`Invalid ${label}`);

/** ?page=&limit= (values are parsed separately by utils/pagination). */
const paginationQueryRules = [
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
];

module.exports = { usernameRule, bioRule, onlyAllowedFields, mongoIdParam, paginationQueryRules };
