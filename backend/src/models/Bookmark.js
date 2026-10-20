/**
 * Bookmark model — one document per (post, user) pair.
 *
 * A separate collection (instead of an array on Post or User) keeps both documents
 * small and lets a unique compound index prevent duplicate bookmarks even under
 * concurrent requests.
 */
const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevents duplicate bookmarks at the database level.
bookmarkSchema.index({ post: 1, user: 1 }, { unique: true });

// "All posts bookmarked by a user, newest first" — drives the saved-posts page.
bookmarkSchema.index({ user: 1, createdAt: -1 });

// "How many users bookmarked a post" — future analytics / post card.
bookmarkSchema.index({ post: 1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
