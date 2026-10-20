/**
 * Points & gamification — single source of truth for StudySync.
 *
 * Two independent points systems live here:
 *
 *   1. POST TRENDING POINTS  (`pointsForEngagement`)
 *      Stored on Post.points. Drives the "trending" feed sort.
 *      Reversed when a like / share is removed.
 *
 *   2. USER GAMIFICATION POINTS  (`awardUserPoints`)
 *      Stored on User.points. Drive the user's level and profile badge.
 *      Awarded to the POST AUTHOR when someone engages with their content.
 *      Self-engagement earns 0 (prevents farming).
 *      Values are the same as engagement points but are completely independent —
 *      changing one set doesn't affect the other.
 *
 * All point values and level thresholds are defined here so they can be
 * adjusted in one place without touching any service or controller.
 */
// NOTE: User model is required lazily inside awardUserPoints to avoid a
// potential circular dependency: User.js exports levelFromPoints which some
// modules import from here, and this file also needs the User model.
// Lazy require ensures both modules are fully initialized before use.

// ---------------------------------------------------------------------------
// Point values (shared for both post-trending and user gamification)
// ---------------------------------------------------------------------------

/**
 * How many points each engagement action is worth.
 * Used for BOTH the post's trending score AND the author's profile points.
 *
 * Spec:
 *   like   → +1 point
 *   comment → +2 points
 *   share   → +3 points
 */
const ENGAGEMENT_POINTS = Object.freeze({
  like: 1,
  comment: 2,
  share: 3,
});

// ---------------------------------------------------------------------------
// Level tier system
// ---------------------------------------------------------------------------

/**
 * Level tiers — ordered from lowest to highest minimum points.
 * Add more tiers here without touching any other file.
 *
 * Each tier:
 *   minPoints — the user needs AT LEAST this many points to be at this level.
 *   level     — numeric level (used in existing `level` virtual on User).
 *   name      — human-readable badge label shown in the UI.
 */
const LEVEL_TIERS = Object.freeze([
  { level: 1, minPoints: 0,    name: 'Beginner'         },
  { level: 2, minPoints: 10,   name: 'Learner'          },
  { level: 3, minPoints: 50,   name: 'Contributor'      },
  { level: 4, minPoints: 150,  name: 'Knowledge Sharer' },
  { level: 5, minPoints: 400,  name: 'Scholar'          },
]);

/**
 * Returns full level info for a given point total.
 * Always returns the highest tier the user has reached.
 *
 * @param {number} points
 * @returns {{ level: number, name: string, minPoints: number,
 *             nextLevel: number|null, nextLevelName: string|null,
 *             nextLevelMinPoints: number|null, pointsToNextLevel: number|null }}
 */
function levelInfo(points) {
  const p = Math.max(0, points || 0);

  // Find the highest tier the user qualifies for (iterate from top down).
  let tierIndex = LEVEL_TIERS.length - 1;
  while (tierIndex > 0 && LEVEL_TIERS[tierIndex].minPoints > p) {
    tierIndex -= 1;
  }

  const current = LEVEL_TIERS[tierIndex];
  const next = LEVEL_TIERS[tierIndex + 1] || null;

  return {
    level: current.level,
    levelName: current.name,
    minPoints: current.minPoints,
    nextLevel: next ? next.level : null,
    nextLevelName: next ? next.name : null,
    nextLevelMinPoints: next ? next.minPoints : null,
    pointsToNextLevel: next ? next.minPoints - p : null,
  };
}

/**
 * Backward-compatible helper: returns just the numeric level number.
 * Kept so existing callers (User model virtual, serializePost) still work.
 *
 * @param {number} points
 * @returns {number}
 */
function levelFromPoints(points) {
  return levelInfo(points).level;
}

// ---------------------------------------------------------------------------
// Post trending helpers (unchanged from original)
// ---------------------------------------------------------------------------

const sameId = (a, b) => Boolean(a && b && a.toString() === b.toString());

/**
 * Points a post earns for one engagement action.
 * Self-engagement earns nothing to prevent post-trending farming.
 *
 * @param {'like'|'comment'|'share'} action
 * @param {{ actorId: any, authorId: any }} ctx
 * @returns {number}
 */
function pointsForEngagement(action, { actorId, authorId }) {
  if (!(action in ENGAGEMENT_POINTS)) throw new Error(`Unknown engagement action: ${action}`);
  if (sameId(actorId, authorId)) return 0;
  return ENGAGEMENT_POINTS[action];
}

// ---------------------------------------------------------------------------
// User gamification helpers
// ---------------------------------------------------------------------------

/**
 * Atomically adjusts a user's gamification points by `delta`.
 * The update pipeline clamps the result at 0 so points can never go negative,
 * even if multiple reversals race against each other.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} delta  positive to award, negative to reverse
 * @returns {Promise<{ points: number }|null>}  updated user projection, or null if not found
 */
async function awardUserPoints(userId, delta) {
  if (delta === 0) return null; // nothing to do

  // Lazy require to avoid circular dependency at module load time.
  const User = require('../models/User');

  return User.findByIdAndUpdate(
    userId,
    [
      {
        $set: {
          points: { $max: [0, { $add: [{ $ifNull: ['$points', 0] }, delta] }] },
        },
      },
    ],
    { returnDocument: 'after', projection: { points: 1 }, updatePipeline: true }
  ).lean();
}

module.exports = {
  ENGAGEMENT_POINTS,
  LEVEL_TIERS,
  levelInfo,
  levelFromPoints,
  pointsForEngagement,
  awardUserPoints,
};

