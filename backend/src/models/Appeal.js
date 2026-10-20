/**
 * Appeal model.
 *
 * Allows users to challenge an admin/AI moderation decision on their
 * own post or comment.
 *
 * Design decisions:
 *   - contentType + contentId form a polymorphic reference (post or comment).
 *   - Only one ACTIVE (pending) appeal per content item is allowed.
 *     Rejected appeals can have a new appeal submitted.
 *   - reviewedBy / reviewedAt / adminNote are populated only when the admin
 *     acts on the appeal.
 *   - appealReady flag on ModerationRecord was already reserved for this.
 */
'use strict';

const mongoose = require('mongoose');

const APPEAL_STATUSES = ['pending', 'approved', 'rejected'];
const APPEAL_CONTENT_TYPES = ['post', 'comment'];

const appealSchema = new mongoose.Schema(
  {
    /** The user who submitted this appeal. */
    appellant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Whether the appealed content is a post or a comment. */
    contentType: {
      type: String,
      enum: APPEAL_CONTENT_TYPES,
      required: true,
    },

    /** ObjectId of the Post or Comment being appealed. */
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    /** The user''s reason for appealing. */
    reason: {
      type: String,
      required: [true, 'Appeal reason is required'],
      trim: true,
      minlength: [10, 'Appeal reason must be at least 10 characters'],
      maxlength: [1000, 'Appeal reason must be at most 1000 characters'],
    },

    /** Current status of this appeal. */
    status: {
      type: String,
      enum: APPEAL_STATUSES,
      default: 'pending',
      index: true,
    },

    /** Admin who reviewed the appeal (null until reviewed). */
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Timestamp when the appeal was reviewed. */
    reviewedAt: {
      type: Date,
      default: null,
    },

    /** Optional admin note sent back to the appellant. */
    adminNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Compound index: one pending appeal per content item.
// (unique partial index — only enforced when status is pending)
appealSchema.index(
  { contentType: 1, contentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'one_pending_per_content',
  }
);

// Fast lookup: all appeals filed by a user, newest first.
appealSchema.index({ appellant: 1, createdAt: -1 });

// Admin queue: pending appeals oldest-first (FIFO review).
appealSchema.index({ status: 1, createdAt: 1 });

const Appeal = mongoose.model('Appeal', appealSchema);
module.exports = Appeal;
module.exports.APPEAL_STATUSES = APPEAL_STATUSES;
module.exports.APPEAL_CONTENT_TYPES = APPEAL_CONTENT_TYPES;
