/**
 * Share model — one document per (post, user) pair.
 *
 * Tracking shares in a separate collection (rather than just incrementing a counter) gives us:
 *   1. Duplicate prevention via the unique compound index: the same user sharing the same post
 *      a second time is a no-op — no extra counter increment, no extra points awarded.
 *   2. An audit trail that the future notifications and points systems can query.
 *   3. `pointsAwarded` stored per-share so the points system can reverse exactly what was
 *      given, even if the point rules change later.
 */
const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Points this share added to the post at creation time.
    // Stored so un-sharing (or post deletion) can reverse the exact amount awarded.
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevents the same user from generating share points for the same post twice.
shareSchema.index({ post: 1, user: 1 }, { unique: true });

// "All posts shared by a user" — future profile-activity feed.
shareSchema.index({ user: 1, createdAt: -1 });

// "All users who shared a specific post" — future notifications / analytics.
shareSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('Share', shareSchema);
