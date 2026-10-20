/**
 * User model.
 * Passwords are hashed with bcrypt in a pre-save hook and are never returned in API responses.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const ROLES = ['user', 'admin'];
const MONTHLY_STREAK_RESTORES = 2;
// Usernames that would clash with routes such as GET /api/users/me
const RESERVED_USERNAMES = ['me'];

/** Current month key, e.g. "2026-10". Used to reset monthly streak restores. */
const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-z0-9_.]+$/, 'Username may only contain letters, numbers, underscores and dots'],
      validate: {
        validator: (v) => !RESERVED_USERNAMES.includes(v),
        message: 'This username is reserved',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default queries
    },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: '', trim: true, maxlength: [300, 'Bio must be at most 300 characters'] },
    role: { type: String, enum: ROLES, default: 'user' },

    // Gamification — points awarded to the author when others engage with their content.
    // Levels are derived from this total by LEVEL_TIERS in points.service.js.
    points: { type: Number, default: 0, min: 0 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastPostDate: { type: Date, default: null },
    streakRestoresRemaining: { type: Number, default: MONTHLY_STREAK_RESTORES, min: 0 },
    streakRestoresMonth: { type: String, default: currentMonthKey }, // "YYYY-MM" the counter belongs to
    // Snapshot of the streak value before the most recent calendar-day boundary.
    // Used by the restoration system to know what value to restore to.
    // Updated on every first-post-of-the-day (whether it extends or resets the streak).
    preRestoreStreak: { type: Number, default: 0, min: 0 },
    // Last date (YYYY-MM-DD in STREAK_TZ) on which a restore was consumed.
    // Guards against duplicate restore requests consuming two restores accidentally.
    lastRestoreDate: { type: String, default: null },

    // Account state
    isSuspended: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    // Incremented on logout to invalidate all previously issued JWTs
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.tokenVersion;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

/**
 * Computes the numeric level from a point total using the tier table in points.service.
 * Lazy-required to avoid a circular dependency at load time
 * (points.service also lazy-requires User for awardUserPoints).
 */
function levelFromPoints(points) {
  // eslint-disable-next-line global-require
  const { levelInfo } = require('../services/points.service');
  return levelInfo(points).level;
}

/** Virtual: numeric level derived from points. */
userSchema.virtual('level').get(function getLevel() {
  // eslint-disable-next-line global-require
  const { levelInfo } = require('../services/points.service');
  return levelInfo(this.points).level;
});

/** Virtual: human-readable level name (e.g. "Contributor"). */
userSchema.virtual('levelName').get(function getLevelName() {
  // eslint-disable-next-line global-require
  const { levelInfo } = require('../services/points.service');
  return levelInfo(this.points).levelName;
});

/** Hash the password whenever it is set or changed. */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
});

/** Compare a plain-text candidate against the stored hash. */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Resets the monthly streak-restore allowance if a new month has started. Returns true if changed.
 *
 * @param {string} [monthKey]  Optional YYYY-MM string (computed in STREAK_TZ by streak.service).
 *                             Falls back to UTC-based currentMonthKey() if omitted.
 */
userSchema.methods.refreshMonthlyRestores = function refreshMonthlyRestores(monthKey) {
  const month = monthKey || currentMonthKey();
  if (this.streakRestoresMonth !== month) {
    this.streakRestoresMonth = month;
    this.streakRestoresRemaining = MONTHLY_STREAK_RESTORES;
    return true;
  }
  return false;
};

// The username field already has a unique index from { unique: true } in the schema.
// Points-descending index for leaderboard-style queries (future use).
userSchema.index({ points: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
module.exports.MONTHLY_STREAK_RESTORES = MONTHLY_STREAK_RESTORES;
module.exports.RESERVED_USERNAMES = RESERVED_USERNAMES;
// levelFromPoints exported for backward-compatibility with existing callers
// (post.service serializePost, comment.service serializeComment).
module.exports.levelFromPoints = levelFromPoints;
