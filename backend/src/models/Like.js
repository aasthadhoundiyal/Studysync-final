/**
 * Like model — one document per (post, user) pair.
 *
 * A separate collection (instead of an array on Post) keeps post documents small and lets a
 * unique compound index guarantee that a user can like a post only once, even under concurrent requests.
 */
const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Engagement points this like added to the post when it was created.
    // Stored so unliking reverses exactly what was awarded, even if point rules change later.
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevents duplicate likes at the database level
likeSchema.index({ post: 1, user: 1 }, { unique: true });
// "Posts liked by a user" (future use, e.g. profile activity)
likeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
