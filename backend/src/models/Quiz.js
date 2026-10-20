/**
 * Quiz model — stores AI-generated quizzes linked to posts.
 *
 * One quiz document per post (upserted on generation).  Re-generation is
 * allowed but respects a cooldown so the Gemini API is not hit on every request.
 */
'use strict';

const mongoose = require('mongoose');

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

/** A single answer option (A–D). */
const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

/** One multiple-choice question with explanation + difficulty. */
const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    options: {
      type: [optionSchema],
      validate: {
        validator: (arr) => arr.length === 4,
        message: 'Each question must have exactly 4 options',
      },
    },
    /** Label of the correct option, e.g. "B". */
    correctAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    explanation: { type: String, required: true, trim: true, maxlength: 1000 },
    difficulty: { type: String, required: true, enum: DIFFICULTY_LEVELS },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    /** The post this quiz was generated from. One quiz per post. */
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, unique: true, index: true },
    /** The user who triggered the most recent generation. */
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => arr.length >= 5 && arr.length <= 10,
        message: 'A quiz must contain 5 to 10 questions',
      },
    },
    /** Snapshot of post context used for generation (useful for debugging / cache busting). */
    postSnapshot: {
      title: { type: String, default: '' },
      tagsHash: { type: String, default: '' }, // MD5-hex of sorted tags, used to detect tag changes
    },
    /** When this quiz was last generated. Used to enforce a re-generation cooldown. */
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** How long (ms) a cached quiz is considered fresh before a new generation is allowed. */
quizSchema.statics.CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
module.exports.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
