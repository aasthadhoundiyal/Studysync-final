/**
 * API route registry. All feature routers are mounted here under /api.
 */
const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const testRoutes = require('./test.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const searchRoutes = require('./search.routes');
const notificationRoutes = require('./notification.routes');
const { postBookmarkRouter, userBookmarkRouter } = require('./bookmark.routes');
const quizRoutes = require('./quiz.routes');
const { summaryRouter, keywordsRouter } = require('./insight.routes');
const adminRoutes = require('./admin.routes');
const appealRoutes = require('./appeal.routes');

const router = Router();

router.use('/health', healthRoutes);
// Admin — mounted first so /admin/* is never caught by post/user wildcards.
router.use('/admin', adminRoutes);
// Appeals — user-facing submit + list own
router.use('/appeals', appealRoutes);
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
// Search — mounted before /users and /posts so the static path is never caught by wildcards.
router.use('/search', searchRoutes);
// Notifications — all authenticated
router.use('/notifications', notificationRoutes);
// Bookmark list lives under /users — must be mounted BEFORE /users so /me/bookmarks
// is not caught by the /:identifier wildcard in user.routes.js.
router.use('/users', userBookmarkRouter);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
// Comments nested under posts: /api/posts/:postId/comments
router.use('/posts/:postId/comments', commentRoutes);
// Bookmarks on a post: /api/posts/:id/bookmark
router.use('/posts/:id/bookmark', postBookmarkRouter);
// Quiz for a post: /api/posts/:postId/quiz
router.use('/posts/:id/quiz', quizRoutes);
// AI Insights — summary and keywords
router.use('/posts/:id/summary', summaryRouter);
router.use('/posts/:id/keywords', keywordsRouter);

module.exports = router;

