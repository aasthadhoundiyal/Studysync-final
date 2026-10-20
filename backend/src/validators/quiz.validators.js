/**
 * Validators for quiz endpoints.
 */
'use strict';

const { query } = require('express-validator');
const { mongoIdParam } = require('./common');

/** POST /:id/quiz and DELETE /:id/quiz — just needs a valid post ID. */
const quizPostIdRules = [mongoIdParam('id', 'post ID')];

/** GET /:id/quiz — valid post ID + optional ?force=true */
const getQuizRules = [
  ...quizPostIdRules,
  query('force')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('force must be "true" or "false"'),
];

module.exports = { quizPostIdRules, getQuizRules };
