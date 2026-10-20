const asyncHandler = require('../utils/asyncHandler');
const likeService = require('../services/like.service');

/** POST /api/posts/:id/like — idempotent */
const likePost = asyncHandler(async (req, res) => {
  const data = await likeService.likePost(req.params.id, req.user);
  res.json({ success: true, ...data });
});

/** DELETE /api/posts/:id/like — idempotent */
const unlikePost = asyncHandler(async (req, res) => {
  const data = await likeService.unlikePost(req.params.id, req.user);
  res.json({ success: true, ...data });
});

/** GET /api/posts/:id/like — { liked, likesCount } for the current viewer */
const getLikeStatus = asyncHandler(async (req, res) => {
  const data = await likeService.getLikeStatus(req.params.id, req.user);
  res.json({ success: true, ...data });
});

module.exports = { likePost, unlikePost, getLikeStatus };
