/**
 * Streak controller.
 *
 * Routes:
 *   GET  /api/users/me/streak         - return current streak info
 *   POST /api/users/me/streak/restore  - consume a monthly restore token
 */
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { getStreakInfo, restoreStreak } = require('../services/streak.service');

/**
 * GET /api/users/me/streak
 *
 * Returns streak fields for the frontend streak widget:
 *   currentStreak          - effective streak (0 when dead)
 *   longestStreak          - historical high-water mark
 *   postedToday            - whether the user has already posted today
 *   isStreakAlive          - true if posted today OR yesterday (gap not yet fatal)
 *   streakRestoresRemaining - restores left this calendar month
 *   streakTz               - timezone used for day boundaries (frontend transparency)
 */
const getMyStreak = asyncHandler(async (req, res) => {
  // Refresh streak-relevant fields in case they changed since last auth.
  const user = await User.findById(req.user._id)
    .select('currentStreak longestStreak lastPostDate streakRestoresRemaining streakRestoresMonth lastRestoreDate')
    .lean();

  const info = getStreakInfo(user);
  res.json({ success: true, streak: info });
});

/**
 * POST /api/users/me/streak/restore
 *
 * Consumes one monthly restore token to revive a broken streak.
 *
 * Success response (200):
 *   { success: true, streak: { ...streakInfo }, alreadyRestored: boolean }
 *
 * alreadyRestored = true means the user already used a restore today;
 * no token was consumed again (idempotent).
 *
 * Error responses:
 *   409 - streak is still alive (nothing to restore)
 *   409 - no restores remaining this month
 */
const restoreMyStreak = asyncHandler(async (req, res) => {
  const { streak, alreadyRestored } = await restoreStreak(req.user._id);
  res.json({ success: true, streak, alreadyRestored });
});

module.exports = { getMyStreak, restoreMyStreak };
