/**
 * Validators for insight (summary + keywords) endpoints.
 * Both share the same shape: valid post ObjectId + optional ?force query param.
 */
'use strict';

const { query } = require('express-validator');
const { mongoIdParam } = require('./common');

const insightPostIdRules = [mongoIdParam('id', 'post ID')];

const getInsightRules = [
  ...insightPostIdRules,
  query('force')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('force must be "true" or "false"'),
];

module.exports = { insightPostIdRules, getInsightRules };
