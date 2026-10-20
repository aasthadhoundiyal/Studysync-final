'use strict';
/**
 * Comprehensive integration smoke-test for all StudySync API features.
 * Run from the backend directory: node integration_test.js
 */
const mongoose = require('mongoose');
const BASE = 'http://localhost:5000/api';
const j = (r) => r.json();
const req = (method, url, token, body) =>
  fetch(BASE + url, {
    method,
    headers: { Authorization: token ? 'Bearer ' + token : '', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
const get  = (url, tok)       => req('GET',    url, tok);
const post = (url, tok, body) => req('POST',   url, tok, body);
const del  = (url, tok)       => req('DELETE', url, tok);

let pass = 0, fail = 0;
function ok(label, cond, info = '') {
  if (cond) { console.log('  PASS:', label); pass++; }
  else { console.error('  FAIL:', label, info ? `(${info})` : ''); fail++; }
}

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/studysync');
  const ts = Date.now();

  // ─── Health ────────────────────────────────────────────────────────────
  console.log('\n── HEALTH ──');
  const health = await get('/health').then(j);
  ok('Health OK', health.success && health.database === 'connected');
  ok('AI configured', health.ai.configured === true);

  // ─── Auth ──────────────────────────────────────────────────────────────
  console.log('\n── AUTH ──');
  const regData = await post('/auth/register', null, { username: 'integ_' + ts, email: 'integ' + ts + '@test.com', password: 'Test@1234' }).then(j);
  ok('Register', !!regData.token, JSON.stringify(regData).slice(0, 80));
  const U = regData.token;
  const UID = regData.user?._id;

  const loginData = await post('/auth/login', null, { identifier: 'admin', password: 'Admin@12345' }).then(j);
  ok('Admin login', !!loginData.token);
  const A = loginData.token;
  const ADMIN_ID = loginData.user?._id;

  // ─── Profile ───────────────────────────────────────────────────────────
  console.log('\n── PROFILE ──');
  const me = await get('/users/me', U).then(j);
  ok('GET /me', !!me._id, JSON.stringify(me).slice(0, 80));

  // ─── Posts ────────────────────────────────────────────────────────────
  console.log('\n── POSTS ──');
  const p1 = await post('/posts', U, { title: 'Integration Test Post', content: 'Testing the full integration of all post-related APIs.', tags: ['integ', 'test'] }).then(j);
  ok('Create post', !!p1.post?._id, JSON.stringify(p1).slice(0, 80));
  const PID = p1.post._id;

  const feed = await get('/posts', U).then(j);
  ok('Feed returns posts', Array.isArray(feed.posts));
  ok('Feed only published', feed.posts.every(p => p.status === 'published'), 'non-published in feed!');

  const singlePost = await get('/posts/' + PID, U).then(j);
  ok('Single post fetch', !!singlePost.post);

  // ─── Likes ────────────────────────────────────────────────────────────
  console.log('\n── LIKES ──');
  const likeRes = await post('/posts/' + PID + '/like', U, {}).then(j);
  ok('Like post', likeRes.success);
  const unlikeRes = await del('/posts/' + PID + '/like', U).then(j);
  ok('Unlike post', unlikeRes.success);

  // ─── Comments ─────────────────────────────────────────────────────────
  console.log('\n── COMMENTS ──');
  const cRes = await post('/posts/' + PID + '/comments', U, { content: 'Great integration test comment!' }).then(j);
  ok('Add comment', !!cRes.comment?._id, JSON.stringify(cRes).slice(0,100));
  const CID = cRes.comment._id;

  const replyRes = await post('/posts/' + PID + '/comments/' + CID + '/replies', U, { content: 'A reply to the comment.' }).then(j);
  ok('Add reply', !!replyRes.reply?._id, JSON.stringify(replyRes).slice(0,100));

  const commentsRes = await get('/posts/' + PID + '/comments', U).then(j);
  ok('Get comments', Array.isArray(commentsRes.comments));
  // Removed comments must not appear in public feed
  ok('Comments hide removed (none removed yet)', commentsRes.comments.every(c => c.moderationStatus !== 'removed' || c === undefined));

  // ─── Bookmarks ────────────────────────────────────────────────────────
  console.log('\n── BOOKMARKS ──');
  const bmRes = await post('/posts/' + PID + '/bookmark', U, {}).then(j);
  ok('Bookmark post', bmRes.success);
  const bmList = await get('/users/me/bookmarks', U).then(j);
  ok('Bookmarks list', Array.isArray(bmList.bookmarks));
  const unbmRes = await del('/posts/' + PID + '/bookmark', U).then(j);
  ok('Unbookmark', unbmRes.success);

  // ─── Shares ───────────────────────────────────────────────────────────
  console.log('\n── SHARES ──');
  const shareRes = await post('/posts/' + PID + '/share', U, {}).then(j);
  ok('Share post', shareRes.success);

  // ─── Search ───────────────────────────────────────────────────────────
  console.log('\n── SEARCH ──');
  const searchRes = await get('/search?q=integration', U).then(j);
  ok('Search returns results', Array.isArray(searchRes.posts), JSON.stringify(searchRes).slice(0,80));

  // ─── Notifications ────────────────────────────────────────────────────
  console.log('\n── NOTIFICATIONS ──');
  const notifRes = await get('/notifications', U).then(j);
  ok('Notifications list', Array.isArray(notifRes.notifications));

  // ─── Streaks ──────────────────────────────────────────────────────────
  console.log('\n── STREAKS ──');
  const streakRes = await get('/users/me/streak', U).then(j);
  ok('Streak info', streakRes.currentStreak !== undefined);

  // ─── Admin: stats ─────────────────────────────────────────────────────
  console.log('\n── ADMIN ──');
  const statsRes = await get('/admin/stats', A).then(j);
  ok('Admin stats', statsRes.success && !!statsRes.stats);

  // ─── Admin: remove post → content removed from feed ───────────────────
  const removePostRes = await post('/admin/posts/' + PID + '/remove', A, { reason: 'Integration test removal' }).then(j);
  ok('Admin remove post', removePostRes.success && removePostRes.post?.status === 'removed');

  // Feed must not include removed post
  const feedAfterRemove = await get('/posts', null).then(j);
  const removedInFeed = feedAfterRemove.posts.some(p => p._id === PID);
  ok('Removed post not in public feed', !removedInFeed);

  // Restored by admin
  const restoreRes = await post('/admin/posts/' + PID + '/restore', A, { reason: 'Test done' }).then(j);
  ok('Admin restore post', restoreRes.success && restoreRes.post?.status === 'published');

  // ─── Admin: comment moderation ────────────────────────────────────────
  const removeCmtRes = await post('/admin/comments/' + CID + '/remove', A, { reason: 'Test comment removal' }).then(j);
  ok('Admin remove comment', removeCmtRes.success);
  // Must not appear in comments list
  const commentsAfterRemoval = await get('/posts/' + PID + '/comments', U).then(j);
  const removedCommentVisible = commentsAfterRemoval.comments.some(c => c._id === CID);
  ok('Removed comment hidden from feed', !removedCommentVisible);
  // Restore comment
  await post('/admin/comments/' + CID + '/restore', A, {});

  // ─── Admin: user management ───────────────────────────────────────────
  const userListRes = await get('/admin/users', A).then(j);
  ok('Admin user list', userListRes.success && userListRes.users.length >= 1);
  const suspRes = await post('/admin/users/' + UID + '/suspend', A, {}).then(j);
  ok('Suspend user', suspRes.success && suspRes.user?.isSuspended === true);
  const reactRes = await post('/admin/users/' + UID + '/reactivate', A, {}).then(j);
  ok('Reactivate user', reactRes.success && reactRes.user?.isSuspended === false);

  // ─── Admin: moderation history ────────────────────────────────────────
  const histRes = await get('/admin/moderation/history', A).then(j);
  ok('Moderation history', histRes.success && histRes.history.length >= 2);

  // ─── Appeals ─────────────────────────────────────────────────────────
  console.log('\n── APPEALS ──');
  // Remove the post so it can be appealed
  await post('/admin/posts/' + PID + '/remove', A, { reason: 'For appeal test' });
  const appealRes = await post('/appeals', U, { contentType: 'post', contentId: PID, reason: 'I believe this was removed in error. The content is fully compliant.' }).then(j);
  ok('Submit appeal', appealRes.success && appealRes.appeal?.status === 'pending', JSON.stringify(appealRes).slice(0,120));
  const APID = appealRes.appeal?._id;

  const appealQRes = await get('/admin/appeals/pending', A).then(j);
  ok('Admin pending appeals queue', appealQRes.success && appealQRes.appeals.some(a => a._id === APID));

  const approveAppealRes = await post('/admin/appeals/' + APID + '/approve', A, { adminNote: 'Appeal accepted, restoring.' }).then(j);
  ok('Admin approve appeal', approveAppealRes.success && approveAppealRes.appeal?.status === 'approved');

  // Post should be published again
  await new Promise(r => setTimeout(r, 150));
  const postCheck = await mongoose.connection.collection('posts').findOne({ _id: new mongoose.Types.ObjectId(PID) });
  ok('Post published after appeal approval', postCheck?.status === 'published', 'status=' + postCheck?.status);

  // ─── Non-admin blocked ────────────────────────────────────────────────
  console.log('\n── AUTH GUARDS ──');
  const noAdminStats = await get('/admin/stats', U);
  ok('Non-admin blocked from /admin/stats', noAdminStats.status === 403);
  const noAuthFeed = await get('/notifications', null);
  ok('No-auth blocked from /notifications', noAuthFeed.status === 401);

  // ─── AI Quiz (cached) ─────────────────────────────────────────────────
  console.log('\n── AI (Quiz cached check) ──');
  // Check that quiz endpoint is accessible (may return cached or generate fresh)
  const quizRes = await get('/posts/' + PID + '/quiz', U);
  ok('Quiz endpoint reachable', quizRes.status === 200 || quizRes.status === 503, 'status=' + quizRes.status);

  // ─── AI Summary (cache-hit) ───────────────────────────────────────────
  const summaryRes = await get('/posts/' + PID + '/summary', U);
  ok('Summary endpoint reachable', summaryRes.status === 200 || summaryRes.status === 503, 'status=' + summaryRes.status);

  // ─── AI Keywords ──────────────────────────────────────────────────────
  const kwRes = await get('/posts/' + PID + '/keywords', U);
  ok('Keywords endpoint reachable', kwRes.status === 200 || kwRes.status === 503, 'status=' + kwRes.status);

  // ─── Cleanup ──────────────────────────────────────────────────────────
  await mongoose.disconnect();

  console.log('\n══ INTEGRATION RESULTS ══');
  console.log(`Passed: ${pass} | Failed: ${fail}`);
  if (fail > 0) process.exit(1);
}
main().catch(e => { console.error('FATAL:', e.message, e.stack?.split('\n')[1]); process.exit(1); });
