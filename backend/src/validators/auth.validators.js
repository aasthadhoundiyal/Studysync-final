/**
 * Request validation rules for auth endpoints.
 */
const { body } = require('express-validator');
const { usernameRule, bioRule } = require('./common');

const registerRules = [
  usernameRule(),
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .bail()
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  bioRule(),
];

// Login accepts `identifier` (email or username). `email` / `username` are accepted as aliases.
const loginRules = [
  body('identifier').customSanitizer((value, { req }) => value || req.body.email || req.body.username),
  body('identifier')
    .exists({ checkFalsy: true })
    .withMessage('Email or username is required')
    .bail()
    .isString()
    .trim()
    .toLowerCase(),
  body('password').exists({ checkFalsy: true }).withMessage('Password is required').bail().isString(),
];

module.exports = { registerRules, loginRules };
