/**
 * Quiz controller — thin HTTP layer over quiz.service.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const quizService = require('../services/quiz.service');

/**
 * GET /api/posts/:id/quiz
 * Returns a cached quiz if fresh, otherwise generates a new one via Gemini.
 * Query: ?force=true  — skip cache and always regenerate.
 */
const getOrGenerateQuiz = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const { quiz, cached } = await quizService.getOrGenerateQuiz(req.params.id, req.user, force);

  res.json({
    success: true,
    cached,
    quiz,
  });
});

/**
 * DELETE /api/posts/:id/quiz
 * Removes the cached quiz for a post (author or admin only).
 */
const deleteQuiz = asyncHandler(async (req, res) => {
  await quizService.deleteQuiz(req.params.id, req.user);
  res.json({ success: true, message: 'Quiz deleted' });
});

module.exports = { getOrGenerateQuiz, deleteQuiz };
