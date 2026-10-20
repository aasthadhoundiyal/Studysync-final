/**
 * Quiz Service — generates and caches AI-powered quizzes from post content.
 *
 * Flow:
 *   1. Load the post (access check happens in the controller via post.service).
 *   2. Check if a fresh cached quiz exists for this post; return it if so.
 *   3. Build a structured Gemini prompt from the post title, content and tags.
 *   4. Call generateJson() from gemini.service, validate the response shape.
 *   5. Upsert the quiz document in MongoDB and return it.
 */
'use strict';

const crypto = require('crypto');
const Post = require('../models/Post');
const Quiz = require('../models/Quiz');
const ApiError = require('../utils/ApiError');
const { generateJson, isGeminiConfigured } = require('./gemini.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic hash of a sorted tag array — used to detect stale caches. */
function tagsHash(tags = []) {
  return crypto.createHash('md5').update([...tags].sort().join(','), 'utf8').digest('hex');
}

/** Truncate text to a safe prompt length to avoid hitting token limits. */
function truncate(text, maxChars = 4000) {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds the Gemini prompt for quiz generation.
 *
 * @param {{ title: string, content: string, tags: string[] }} post
 * @returns {string}
 */
function buildQuizPrompt(post) {
  const tagLine = post.tags && post.tags.length ? post.tags.join(', ') : 'general';
  const content = truncate(post.content, 4000);

  return (
    'You are an expert educational content creator.\n' +
    'Generate a quiz with 5 to 10 multiple-choice questions based on the following study post.\n\n' +
    '--- POST START ---\n' +
    'Title: ' + post.title + '\n' +
    'Tags: ' + tagLine + '\n' +
    'Content:\n' + content + '\n' +
    '--- POST END ---\n\n' +
    'Rules:\n' +
    '- Generate between 5 and 10 questions (choose the count that best covers the material).\n' +
    '- Each question must have exactly 4 options labelled A, B, C, D.\n' +
    '- Only one option is correct.\n' +
    '- Provide a short explanation (1–3 sentences) for the correct answer.\n' +
    '- Assign a difficulty: "easy", "medium", or "hard".\n' +
    '- Questions must be strictly based on the post content — no outside knowledge.\n' +
    '- Do not repeat questions.\n\n' +
    'Return ONLY a raw JSON object (no markdown, no explanation) in this exact shape:\n' +
    '{\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "question": "string",\n' +
    '      "options": [\n' +
    '        { "label": "A", "text": "string" },\n' +
    '        { "label": "B", "text": "string" },\n' +
    '        { "label": "C", "text": "string" },\n' +
    '        { "label": "D", "text": "string" }\n' +
    '      ],\n' +
    '      "correctAnswer": "A|B|C|D",\n' +
    '      "explanation": "string",\n' +
    '      "difficulty": "easy|medium|hard"\n' +
    '    }\n' +
    '  ]\n' +
    '}'
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_LABELS = new Set(['A', 'B', 'C', 'D']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/**
 * Validates the raw Gemini response and returns the questions array.
 * Throws ApiError(502) when the AI response is unusable.
 *
 * @param {unknown} raw
 * @returns {{ question: string, options: object[], correctAnswer: string, explanation: string, difficulty: string }[]}
 */
function validateGeminiResponse(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.questions)) {
    throw new ApiError(502, 'AI returned an unexpected response structure. Please try again.');
  }

  const { questions } = raw;

  if (questions.length < 5 || questions.length > 10) {
    throw new ApiError(502, 'AI returned an invalid number of questions. Please try again.');
  }

  questions.forEach((q, idx) => {
    const label = '#' + (idx + 1);

    if (!q || typeof q.question !== 'string' || !q.question.trim()) {
      throw new ApiError(502, 'AI returned a malformed question ' + label + '.');
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new ApiError(502, 'Question ' + label + ' does not have exactly 4 options.');
    }
    q.options.forEach((opt) => {
      if (!opt || !VALID_LABELS.has(opt.label) || typeof opt.text !== 'string' || !opt.text.trim()) {
        throw new ApiError(502, 'Question ' + label + ' has a malformed option.');
      }
    });
    if (!VALID_LABELS.has(q.correctAnswer)) {
      throw new ApiError(502, 'Question ' + label + ' has an invalid correctAnswer.');
    }
    if (!VALID_DIFFICULTIES.has(q.difficulty)) {
      throw new ApiError(502, 'Question ' + label + ' has an invalid difficulty.');
    }
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) {
      throw new ApiError(502, 'Question ' + label + ' is missing an explanation.');
    }
  });

  return questions;
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/** Returns the quiz in the shape sent to the client. */
function serializeQuiz(quiz) {
  return {
    _id: quiz._id,
    post: quiz.post,
    generatedAt: quiz.generatedAt,
    questions: quiz.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns an existing quiz for a post (if fresh) or generates a new one.
 *
 * @param {string}  postId   Validated MongoDB ObjectId string.
 * @param {object}  viewer   Authenticated user (req.user).
 * @param {boolean} [force]  If true, skip the cache and always regenerate.
 * @returns {Promise<{ quiz: object, cached: boolean }>}
 */
async function getOrGenerateQuiz(postId, viewer, force = false) {
  if (!isGeminiConfigured()) {
    throw new ApiError(503, 'AI study features are temporarily unavailable. Please try again later.');
  }

  // Load the post (access control: post.service already handles visibility).
  const post = await Post.findById(postId).select('title content tags status author').lean();
  if (!post) throw ApiError.notFound('Post not found');
  if (post.status !== 'published') {
    const isOwner = viewer && post.author && post.author.toString() === viewer._id.toString();
    const isAdmin = viewer && viewer.role === 'admin';
    if (!isOwner && !isAdmin) throw ApiError.notFound('Post not found');
  }

  const currentTagsHash = tagsHash(post.tags);
  const now = Date.now();

  // --- Cache check ---
  if (!force) {
    const existing = await Quiz.findOne({ post: postId }).lean();
    if (existing) {
      const age = now - new Date(existing.generatedAt).getTime();
      const stale =
        age > Quiz.CACHE_TTL_MS ||
        existing.postSnapshot.title !== post.title ||
        existing.postSnapshot.tagsHash !== currentTagsHash;

      if (!stale) {
        return { quiz: serializeQuiz(existing), cached: true };
      }
    }
  }

  // --- Generate (with one retry for transient 503 / overload) ---
  const prompt = buildQuizPrompt(post);
  let raw = await generateJson(prompt, { temperature: 0.4, maxTokens: 4096 });

  // Single retry after 4 seconds for transient overload / 503 errors.
  if (raw && raw.available === false) {
    const reason = (raw.reason || '').toLowerCase();
    const isTransient = reason.includes('overloaded') || reason.includes('temporarily') || reason.includes('demand');
    if (isTransient) {
      console.log('[quiz] Gemini 503, retrying in 4s...');
      await new Promise((resolve) => setTimeout(resolve, 4000));
      raw = await generateJson(prompt, { temperature: 0.4, maxTokens: 4096 });
    }
  }

  // Soft-fail from gemini.service (key missing, network error, quota, etc.)
  if (raw && raw.available === false) {
    throw new ApiError(503, raw.reason || 'AI service is currently unavailable.');
  }

  const questions = validateGeminiResponse(raw);

  // --- Upsert (one quiz per post) ---
  const quiz = await Quiz.findOneAndUpdate(
    { post: postId },
    {
      $set: {
        generatedBy: viewer._id,
        questions,
        postSnapshot: { title: post.title, tagsHash: currentTagsHash },
        generatedAt: new Date(),
      },
    },
    { returnDocument: 'after', upsert: true, runValidators: true }
  ).lean();

  return { quiz: serializeQuiz(quiz), cached: false };
}

/**
 * Deletes the cached quiz for a post.
 * Only the post author or an admin may do this.
 *
 * @param {string} postId
 * @param {object} requester
 */
async function deleteQuiz(postId, requester) {
  const post = await Post.findById(postId).select('author').lean();
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = post.author && post.author.toString() === requester._id.toString();
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to delete this quiz');
  }

  await Quiz.deleteOne({ post: postId });
  return { postId };
}

module.exports = { getOrGenerateQuiz, deleteQuiz };
