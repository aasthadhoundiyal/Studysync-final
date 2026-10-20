/**
 * ModerationRecord model.
 *
 * Tracks every admin action taken on a post or comment.
 * Provides an immutable audit trail for the moderation history endpoint.
 *
 * Design decisions:
 *   - One document per action (not one per content item).
 *     Multiple actions on the same content produce multiple records.
 *   - contentType + contentId let the history endpoint filter by either
 *     posts or comments uniformly.
 *   - appealReady: reserved for the future appeals system; defaults to false.
 */
'use strict';

const mongoose = require('mongoose');

const MODERATION_ACTIONS = ['approved', 'removed', 'restored'];
const CONTENT_TYPES = ['post', 'comment'];

const moderationRecordSchema = new mongoose.Schema(
  {
    /** The admin who took the action. */
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Whether the target is a post or a comment. */
    contentType: {
      type: String,
      enum: CONTENT_TYPES,
      required: true,
    },

    /** ObjectId of the Post or Comment being acted on. */
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    /** The decision taken by the admin. */
    action: {
      type: String,
      enum: MODERATION_ACTIONS,
      required: true,
    },

    /** Optional human-readable reason (shown to the content author). */
    reason: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },

    /**
     * Previous status of the content before this action.
     * Stored so the history can show full before/after transitions.
     */
    previousStatus: {
      type: String,
      default: '',
    },

    /**
     * New status after the action.
     */
    newStatus: {
      type: String,
      default: '',
    },

    /** Reserved for the future appeals system. */
    appealReady: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Primary read patterns for the admin history endpoint.
moderationRecordSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });
moderationRecordSchema.index({ admin: 1, createdAt: -1 });
moderationRecordSchema.index({ createdAt: -1 }); // global history feed

const ModerationRecord = mongoose.model('ModerationRecord', moderationRecordSchema);
module.exports = ModerationRecord;
module.exports.MODERATION_ACTIONS = MODERATION_ACTIONS;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
