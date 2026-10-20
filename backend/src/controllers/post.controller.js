const asyncHandler = require('../utils/asyncHandler');
const postService = require('../services/post.service');
const userService = require('../services/user.service');
const { parsePagination } = require('../utils/pagination');
const { normalizeTag } = require('../validators/post.validators');
const { toAttachment } = require('../middleware/upload');

/**
 * POST /api/posts
 *   application/json:     { title, content, tags? }
 *   multipart/form-data:  title, content?, tags?, attachments (0-10 files)
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body;
  const attachments = (req.files || []).map(toAttachment);
  const post = await postService.createPost(req.user, { title, content, tags, attachments });
  res.status(201).json({ success: true, message: 'Post created', post });
});

/** GET /api/posts?sort=newest|oldest|trending&q=&tag=&page=&limit= */
const getFeed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = req.query.sort || 'newest';
  const tag = req.query.tag ? normalizeTag(req.query.tag) : undefined;
  // Optional free-text search; sanitised in the service (max 200 chars, trimmed).
  const q = req.query.q ? String(req.query.q).trim().slice(0, 200) : undefined;

  const result = await postService.getFeed({ sort, tag, q, page, limit, skip, viewer: req.user });
  res.json({ success: true, sort, tag: tag || null, q: q || null, ...result });
});

/** GET /api/posts/:id */
const getPost = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id, req.user);
  res.json({ success: true, post });
});

/** GET /api/users/:identifier/posts?sort=&page=&limit= */
const getUserPosts = asyncHandler(async (req, res) => {
  const user = await userService.findVisibleUser(req.params.identifier, req.user);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = req.query.sort || 'newest';

  const result = await postService.getPostsByUser(user, { sort, page, limit, skip, viewer: req.user });
  res.json({
    success: true,
    user: { _id: user._id, username: user.username, profilePicture: user.profilePicture },
    sort,
    ...result,
  });
});

/** DELETE /api/posts/:id */
const deletePost = asyncHandler(async (req, res) => {
  const { _id } = await postService.deletePost(req.params.id, req.user);
  res.json({ success: true, message: 'Post deleted', postId: _id });
});

module.exports = { createPost, getFeed, getPost, getUserPosts, deletePost };
