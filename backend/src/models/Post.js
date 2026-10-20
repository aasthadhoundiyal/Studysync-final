/**
 * Post model.
 *
 * Server-controlled fields (never set from request bodies):
 *   author, likes, likesCount, commentsCount, sharesCount, points, status
 */
const mongoose = require('mongoose');

const ATTACHMENT_TYPES = ['image', 'video', 'document'];
const POST_STATUSES = ['published', 'pending_review', 'removed']; // moderation will use the non-published states
const LIMITS = {
  titleMin: 3,
  titleMax: 150,
  contentMax: 10000,
  maxTags: 10,
  tagMax: 30,
  maxAttachments: 10,
};

/**
 * Attachment sub-document, filled in by the upload middleware (see middleware/upload.js -> toAttachment).
 */
const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ATTACHMENT_TYPES, required: true }, // image | video | document
    url: { type: String, required: true }, // public path, e.g. "/uploads/posts/<random>.png"
    originalName: { type: String, default: '' }, // sanitized original filename (display only)
    mimeType: { type: String, default: '' }, // canonical MIME type, e.g. "application/pdf"
    extension: { type: String, default: '' }, // e.g. "pdf"
    size: { type: Number, default: 0, min: 0 }, // bytes
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Post author is required'] },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [LIMITS.titleMin, `Title must be at least ${LIMITS.titleMin} characters`],
      maxlength: [LIMITS.titleMax, `Title must be at most ${LIMITS.titleMax} characters`],
    },
    content: {
      type: String,
      // Text is required unless the post shares at least one attachment
      required: [
        function contentRequired() {
          return !this.attachments || this.attachments.length === 0;
        },
        'Content is required',
      ],
      default: '',
      trim: true,
      maxlength: [LIMITS.contentMax, `Content must be at most ${LIMITS.contentMax} characters`],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= LIMITS.maxAttachments,
        message: `A post can have at most ${LIMITS.maxAttachments} attachments`,
      },
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: LIMITS.tagMax }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= LIMITS.maxTags,
        message: `A post can have at most ${LIMITS.maxTags} tags`,
      },
    },

    // Engagement counters — updated atomically by the like/comment/share services, never from request data.
    // Individual likes are stored in the Like collection (unique per post+user).
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0 },

    // Moderation state (only "published" is used until AI moderation is implemented)
    status: { type: String, enum: POST_STATUSES, default: 'published' },
  },
  { timestamps: true }
);

// Feed / profile queries
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ status: 1, points: -1, createdAt: -1 });
postSchema.index({ author: 1, status: 1, createdAt: -1 });
postSchema.index({ tags: 1, status: 1, createdAt: -1 });
// Full-text search (used by the upcoming search feature)
postSchema.index({ title: 'text', content: 'text', tags: 'text' }, { weights: { title: 5, tags: 3, content: 1 } });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
module.exports.ATTACHMENT_TYPES = ATTACHMENT_TYPES;
module.exports.POST_STATUSES = POST_STATUSES;
module.exports.POST_LIMITS = LIMITS;
