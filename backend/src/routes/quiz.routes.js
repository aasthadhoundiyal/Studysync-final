/**
 * Quiz routes — mounted under /api/posts/:id/quiz in routes/index.js.
 *
 * All routes require authentication (protect).
 * Route param :id is the post ObjectId (validated by getQuizRules / quizPostIdRules).
 */
'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/quiz.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getQuizRules, quizPostIdRules } = require('../validators/quiz.validators');

const router = Router({ mergeParams: true }); // mergeParams so :id from parent is visible

/**
 * GET  /api/posts/:id/quiz          — get (or generate) a quiz for the post
 * DELETE /api/posts/:id/quiz        — delete the cached quiz (author / admin)
 */
router.get('/', protect, validate(getQuizRules), ctrl.getOrGenerateQuiz);
router.delete('/', protect, validate(quizPostIdRules), ctrl.deleteQuiz);

module.exports = router;
