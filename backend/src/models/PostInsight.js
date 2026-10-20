/**
 * PostInsight model — stores AI-generated summary and keywords for a post.
 *
 * One document per post (upserted on generation).
 * Both summary and keywords are stored together so a single DB round-trip
 * serves either feature. Each field tracks its own generatedAt timestamp
 * so they can be cached and refreshed independently.
 */
'use strict';

const mongoose = require('mongoose');

const postInsightSchema = new mongoose.Schema(
  {
    /** The post this insight belongs to. One document per post. */
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },

    summary: {
      text: { type: String, default: '' },
      generatedAt: { type: Date, default: null },
      /** Snapshot of post title at time of generation (used for staleness check). */
      titleSnapshot: { type: String, default: '' },
      contentLengthSnapshot: { type: Number, default: 0 },
    },

    keywords: {
      list: { type: [String], default: [] },
      generatedAt: { type: Date, default: null },
      titleSnapshot: { type: String, default: '' },
      contentLengthSnapshot: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

/** How long (ms) a cached insight is considered fresh. */
postInsightSchema.statics.CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const PostInsight = mongoose.model('PostInsight', postInsightSchema);
module.exports = PostInsight;
