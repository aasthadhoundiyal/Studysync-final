/**
 * Share controller — thin HTTP layer over share.service.
 */
const asyncHandler = require('../utils/asyncHandler');
const shareService = require('../services/share.service');

/**
 * POST /api/posts/:id/share
 * Records a share for the authenticated user and returns the shareable URL + updated count.
 * Idempotent: calling again returns the current state without double-counting.
 */
const sharePost = asyncHandler(async (req, res) => {
  const data = await shareService.sharePost(req.params.id, req.user);
  const message = data.alreadyShared ? 'Post already shared' : 'Post shared';
  res.json({ success: true, message, ...data });
});

/**
 * GET /api/posts/:id/share
 * Returns the share count, the shareable URL, and whether the current viewer has shared.
 * Token is optional — anonymous callers receive hasShared: false.
 */
const getShareStatus = asyncHandler(async (req, res) => {
  const data = await shareService.getShareStatus(req.params.id, req.user);
  res.json({ success: true, ...data });
});

module.exports = { sharePost, getShareStatus };
