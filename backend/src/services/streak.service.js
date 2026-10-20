/**
 * Daily posting streak service.
 *
 * Streak rules:
 *   - A "calendar day" is defined by the configured STREAK_TZ (default UTC).
 *   - Posting at least once on a calendar day counts as that day's post.
 *   - Posting multiple times on the same day counts as ONE streak day.
 *   - Posting on consecutive days keeps the streak alive.
 *   - Missing a day resets currentStreak to 1 (the new post starts a fresh streak).
 *   - longestStreak tracks the historical high-water mark.
 *
 * All updates use findByIdAndUpdate so they are atomic.
 */
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Converts a JS Date to a YYYY-MM-DD string in the configured streak timezone.
 * Uses the native Intl API (available in Node.js >= 13 without extra dependencies).
 *
 * @param {Date} date
 * @returns {string}  e.g. "2026-10-08"
 */
function toDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.streakTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns the current month as a "YYYY-MM" string in the configured streak timezone.
 * Used to determine whether the monthly restore allowance needs a reset.
 *
 * @param {Date} [date=new Date()]
 * @returns {string}  e.g. "2026-10"
 */
function toMonthKey(date) {
  if (!date) date = new Date();
  return toDateKey(date).slice(0, 7);
}

/**
 * Returns the date key for "yesterday" relative to the given date in the streak timezone.
 *
 * We subtract exactly 24 hours (86 400 000 ms) so toDateKey() handles all TZ conversion.
 * Do NOT use d.setDate(d.getDate() - 1) — that uses local system timezone arithmetic.
 *
 * @param {Date} date
 * @returns {string}  e.g. "2026-10-07"
 */
function yesterdayKey(date) {
  return toDateKey(new Date(date.getTime() - 24 * 60 * 60 * 1000));
}

/**
 * Computes what the new streak counters should be given the previous state.
 *
 * @param {{ currentStreak: number, longestStreak: number, lastPostDate: Date|null }} prev
 * @param {Date} now
 * @returns {{ currentStreak: number, longestStreak: number, lastPostDate: Date, alreadyPostedToday: boolean }}
 */
function computeStreakUpdate(prev, now) {
  const todayKey = toDateKey(now);
  const lastKey = prev.lastPostDate ? toDateKey(prev.lastPostDate) : null;

  if (lastKey === todayKey) {
    return {
      currentStreak: prev.currentStreak,
      longestStreak: prev.longestStreak,
      lastPostDate: prev.lastPostDate,
      alreadyPostedToday: true,
    };
  }

  const newStreak = lastKey === yesterdayKey(now) ? prev.currentStreak + 1 : 1;
  const newLongest = Math.max(prev.longestStreak || 0, newStreak);

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastPostDate: now,
    alreadyPostedToday: false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called after a post is successfully created. Atomically updates streak fields.
 * Also records preRestoreStreak = old currentStreak before this change, giving the
 * restoration system a valid previous-streak snapshot to restore to.
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {Date} [now=new Date()]
 * @returns {Promise<{ currentStreak: number, longestStreak: number, postedToday: boolean }>}
 */
async function updateStreakOnPost(userId, now) {
  if (!now) now = new Date();

  const user = await User.findById(userId)
    .select('currentStreak longestStreak lastPostDate')
    .lean();

  if (!user) return { currentStreak: 0, longestStreak: 0, postedToday: false };

  const update = computeStreakUpdate(user, now);

  if (!update.alreadyPostedToday) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        currentStreak: update.currentStreak,
        longestStreak: update.longestStreak,
        lastPostDate: update.lastPostDate,
        // Snapshot the old streak — restoration target.
        preRestoreStreak: user.currentStreak || 0,
      },
    });
  }

  return {
    currentStreak: update.currentStreak,
    longestStreak: update.longestStreak,
    postedToday: true,
  };
}

/**
 * Returns the current streak status for a user.
 * Detects a "dead" streak: if lastPostDate is neither today nor yesterday,
 * the streak has been broken and currentStreak should be 0 in the UI.
 *
 * @param {object} user  - Mongoose user doc or lean object with streak fields
 * @param {Date} [now=new Date()]
 * @returns {{ currentStreak, longestStreak, postedToday, isStreakAlive,
 *             streakRestoresRemaining, streakTz }}
 */
function getStreakInfo(user, now) {
  if (!now) now = new Date();
  const todayKey = toDateKey(now);
  const lastKey = user.lastPostDate ? toDateKey(user.lastPostDate) : null;

  const postedToday = lastKey === todayKey;
  const postedYesterday = lastKey === yesterdayKey(now);
  const isStreakAlive = postedToday || postedYesterday;
  const effectiveStreak = isStreakAlive ? (user.currentStreak || 0) : 0;

  return {
    currentStreak: effectiveStreak,
    longestStreak: user.longestStreak || 0,
    postedToday,
    isStreakAlive,
    streakRestoresRemaining: user.streakRestoresRemaining != null ? user.streakRestoresRemaining : 0,
    streakTz: env.streakTz,
  };
}

// ---------------------------------------------------------------------------
// Restoration
// ---------------------------------------------------------------------------

/**
 * Restores a broken streak for a user, consuming one monthly restore token.
 *
 * Validation rules (all must pass):
 *  1. Restores remaining > 0 for this month (auto-resets if a new month has started).
 *  2. The streak must be DEAD (lastPostDate is neither today nor yesterday).
 *  3. User must not have already restored today (idempotency guard — returns cached
 *     result without consuming another token if the same user calls twice today).
 *
 * Restoration effect:
 *  - currentStreak  <- preRestoreStreak (min 1)
 *  - lastPostDate   <- yesterday (makes isStreakAlive = true; user still must post today)
 *  - longestStreak  <- max(longestStreak, restoredStreak)
 *  - streakRestoresRemaining -= 1
 *  - lastRestoreDate <- today's YYYY-MM-DD key
 *
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {Date} [now=new Date()]
 * @returns {Promise<{ streak: object, alreadyRestored: boolean }>}
 * @throws {ApiError} 409 if conditions are not met
 */
async function restoreStreak(userId, now) {
  if (!now) now = new Date();

  const todayKey = toDateKey(now);
  const monthKey = toMonthKey(now);

  const user = await User.findById(userId)
    .select(
      'currentStreak longestStreak lastPostDate preRestoreStreak ' +
      'streakRestoresRemaining streakRestoresMonth lastRestoreDate'
    )
    .lean();

  if (!user) throw ApiError.notFound('User not found');

  // ── Monthly allowance (auto-reset if month changed) ──
  const isNewMonth = user.streakRestoresMonth !== monthKey;
  const effectiveRestoresRemaining = isNewMonth
    ? User.MONTHLY_STREAK_RESTORES
    : (user.streakRestoresRemaining != null ? user.streakRestoresRemaining : 0);

  if (effectiveRestoresRemaining <= 0) {
    throw ApiError.conflict(
      'No streak restorations remaining this month. Your allowance resets at the start of next month.'
    );
  }

  // ── Streak must be dead ──
  const lastKey = user.lastPostDate ? toDateKey(new Date(user.lastPostDate)) : null;
  const postedToday = lastKey === todayKey;
  const postedYesterday = lastKey === yesterdayKey(now);
  const isStreakAlive = postedToday || postedYesterday;

  if (isStreakAlive) {
    throw ApiError.conflict(
      'Your streak is still active — restorations can only be used after missing a day.'
    );
  }

  // ── Idempotency: already restored today ──
  if (user.lastRestoreDate === todayKey) {
    const refreshedUser = await User.findById(userId)
      .select(
        'currentStreak longestStreak lastPostDate streakRestoresRemaining streakRestoresMonth lastRestoreDate'
      )
      .lean();
    return { streak: getStreakInfo(refreshedUser, now), alreadyRestored: true };
  }

  // ── Compute restored streak value ──
  const restoredStreak = Math.max(user.preRestoreStreak || 0, 1);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── Persist atomically ──
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        currentStreak: restoredStreak,
        longestStreak: Math.max(user.longestStreak || 0, restoredStreak),
        lastPostDate: yesterdayDate,
        lastRestoreDate: todayKey,
        streakRestoresRemaining: effectiveRestoresRemaining - 1,
        streakRestoresMonth: monthKey,
      },
    },
    {
      returnDocument: 'after',
      projection: {
        currentStreak: 1,
        longestStreak: 1,
        lastPostDate: 1,
        streakRestoresRemaining: 1,
        streakRestoresMonth: 1,
        lastRestoreDate: 1,
      },
    }
  ).lean();

  return { streak: getStreakInfo(updatedUser, now), alreadyRestored: false };
}

module.exports = {
  updateStreakOnPost,
  getStreakInfo,
  restoreStreak,
  toDateKey,
  toMonthKey,
  yesterdayKey,
  computeStreakUpdate,
};
