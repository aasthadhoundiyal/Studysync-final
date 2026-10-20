/**
 * Request validation rules for profile endpoints.
 */
const { body, param } = require('express-validator');
const { usernameRule, bioRule, onlyAllowedFields } = require('./common');

const UPDATABLE_FIELDS = ['username', 'bio', 'profilePicture'];

/** profilePicture via JSON: an http(s) URL, or '' to clear it. (File uploads use the dedicated endpoint.) */
const profilePictureUrlRule = body('profilePicture')
  .optional()
  .isString()
  .withMessage('Profile picture must be a string')
  .bail()
  .trim()
  .custom((value) => {
    if (value === '') return true;
    const ok = /^https?:\/\/\S+$/i.test(value) && value.length <= 2048;
    if (!ok) throw new Error('Profile picture must be a valid http(s) URL');
    return true;
  });

const updateProfileRules = [
  onlyAllowedFields(UPDATABLE_FIELDS),
  usernameRule('username', { optional: true }),
  bioRule('bio', { optional: true }),
  profilePictureUrlRule,
];

const updateUsernameRules = [onlyAllowedFields(['username']), usernameRule('username')];

const updateBioRules = [onlyAllowedFields(['bio']), bioRule('bio', { optional: false })];

const identifierParamRules = [
  param('identifier')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Invalid user identifier')
    .bail()
    .matches(/^[A-Za-z0-9_.]+$/)
    .withMessage('Invalid user identifier'),
];

module.exports = { updateProfileRules, updateUsernameRules, updateBioRules, identifierParamRules };
