/**
 * Comment model.
 *
 * Supports two levels of nesting:
 *   - Top-level comments: parentComment === null
 *   - Replies:           parentComment = ObjectId of a top-level comment
 *
 * Server-controlled fields (never set from request bodies):
 *   author, post, parentComment, repliesCount, pointsAwarded
 */
const mongoose = require('mongoose');

const ATTACHMENT_TYPES = ['image', 'video', 'document'];

const COMMENT_LIMITS = {
  contentMin: 1,
  contentMax: 2000,
  maxAttachments: 5,
};

/**
 * Attachment sub-document — identical shape to Post attachments,
 * populated by the upload middleware via toAttachment().
 */
const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ATTACHMENT_TYPES, required: true },
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    extension: { type: String, default: '' },
    size: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: [true, 'Comment must belong to a post'] },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    content: {
      type: String,
      required: [
        function contentRequired() {
          return !this.attachments || this.attachments.length === 0;
        },
        'Comment content is required',
      ],
      default: '',
      trim: true,
      maxlength: [COMMENT_LIMITS.contentMax, `Comment must be at most ${COMMENT_LIMITS.contentMax} characters`],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= COMMENT_LIMITS.maxAttachments,
        message: `A comment can have at most ${COMMENT_LIMITS.maxAttachments} attachments`,
      },
    },

    // Null for top-level comments; ObjectId for replies.
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },

    // Only tracked on top-level comments (parentComment === null).
    repliesCount: { type: Number, default: 0, min: 0 },

    // Points awarded to the post for this comment; stored so deletion can reverse them cleanly.
    pointsAwarded: { type: Number, default: 0, min: 0 },

    // Admin moderation status — separate from the user-initiated soft-delete (isDeleted).
    // 'published'      → visible in feeds (default for all new comments)
    // 'removed'        → hidden by admin action; can be restored
    // 'pending_review' → flagged, awaiting admin decision (reserved for future auto-flag)
    moderationStatus: {
      type: String,
      enum: ['published', 'pending_review', 'removed'],
      default: 'published',
      index: true,
    },

    // Soft-delete flag — comment body is wiped but the document is kept so reply threads stay intact.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Primary read patterns
commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 }); // paginate top-level / replies
commentSchema.index({ post: 1, createdAt: -1 });                   // recent comments across a post
commentSchema.index({ author: 1, createdAt: -1 });                 // user activity feed (future)

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
module.exports.COMMENT_LIMITS = COMMENT_LIMITS;
