/**
 * Notification system verification script.
 * Run: node scripts/verifyNotifications.js
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const app = require('../src/app');

function req(server, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { hostname: 'localhost', port, path, method, headers };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));

  let pass = 0;
  let fail = 0;
  function check(name, cond, info) {
    if (cond) { console.log('PASS', name); pass++; }
    else { console.log('FAIL', name, '->', JSON.stringify(info || '').slice(0, 200)); fail++; }
  }

  const User = require('../src/models/User');
  const { signToken } = require('../src/utils/token');
  const Notification = require('../src/models/Notification');
  const notifService = require('../src/services/notification.service');

  const anyUser = await User.findOne().select('+tokenVersion');
  if (!anyUser) {
    console.log('No users in DB. Cannot run tests.');
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  const token = signToken(anyUser);
  const userId = anyUser._id.toString();
  console.log('Using user:', anyUser.username, '|', userId);

  // ── 1. Auth enforcement ──────────────────────────────────────────────────
  let r = await req(server, 'GET', '/api/notifications');
  check('GET /notifications unauthenticated = 401', r.status === 401, r.body);

  r = await req(server, 'GET', '/api/notifications/unread-count');
  check('GET /unread-count unauthenticated = 401', r.status === 401, r.body);

  r = await req(server, 'PATCH', '/api/notifications/read-all');
  check('PATCH /read-all unauthenticated = 401', r.status === 401, r.body);

  // ── 2. Authenticated read ────────────────────────────────────────────────
  r = await req(server, 'GET', '/api/notifications?page=1&limit=10', null, token);
  check('GET /notifications authenticated = 200', r.status === 200 && Array.isArray(r.body.notifications), r.body);
  check('GET /notifications has pagination', r.status === 200 && r.body.pagination && typeof r.body.pagination.total === 'number', r.body);

  // ── 3. Unread count ──────────────────────────────────────────────────────
  r = await req(server, 'GET', '/api/notifications/unread-count', null, token);
  check('GET /unread-count returns number', r.status === 200 && typeof r.body.unreadCount === 'number', r.body);

  // ── 4. Mark all read ─────────────────────────────────────────────────────
  r = await req(server, 'PATCH', '/api/notifications/read-all', null, token);
  check('PATCH /read-all returns updatedCount', r.status === 200 && typeof r.body.updatedCount === 'number', r.body);

  // ── 5. Filter unread only ────────────────────────────────────────────────
  r = await req(server, 'GET', '/api/notifications?unread=true', null, token);
  check('GET /notifications?unread=true works', r.status === 200 && Array.isArray(r.body.notifications), r.body);

  // ── 6. Validation: bad ID ────────────────────────────────────────────────
  r = await req(server, 'PATCH', '/api/notifications/not-a-mongo-id/read', null, token);
  check('PATCH /notifications/bad-id/read = 400', r.status === 400, r.body);

  // ── 7. Non-existent ID → 404 ─────────────────────────────────────────────
  const fakeId = new mongoose.Types.ObjectId().toString();
  r = await req(server, 'PATCH', '/api/notifications/' + fakeId + '/read', null, token);
  check('PATCH non-existent ID = 404', r.status === 404, r.body);

  // ── 8. Create + read back ────────────────────────────────────────────────
  await notifService.createNotification({
    recipient: userId,
    actor: null,
    type: 'moderation_removed',
    message: 'Test notification: post removed.',
    relatedPost: null,
  });

  r = await req(server, 'GET', '/api/notifications?limit=50', null, token);
  const created = (r.body.notifications || []).find((n) => n.message === 'Test notification: post removed.');
  check('Created notification appears in list', !!created, r.body.notifications ? r.body.notifications.slice(0, 2) : []);
  check('Notification has correct type', created && created.type === 'moderation_removed', created);
  check('Notification isRead starts false', created && created.isRead === false, created);
  check('Notification has createdAt', created && !!created.createdAt, created);

  // ── 9. Unread count incremented ───────────────────────────────────────────
  r = await req(server, 'GET', '/api/notifications/unread-count', null, token);
  check('Unread count > 0 after new notification', r.status === 200 && r.body.unreadCount > 0, r.body);

  // ── 10. Mark one as read ──────────────────────────────────────────────────
  if (created) {
    r = await req(server, 'PATCH', '/api/notifications/' + created._id + '/read', null, token);
    check('PATCH /:id/read marks it read', r.status === 200 && r.body.notification && r.body.notification.isRead === true, r.body);
  }

  // ── 11. Self-notification prevention ─────────────────────────────────────
  const beforeSelf = await Notification.countDocuments({ recipient: anyUser._id, type: 'like' });
  await notifService.notifyLike(new mongoose.Types.ObjectId(), anyUser._id, anyUser._id, 'self');
  const afterSelf = await Notification.countDocuments({ recipient: anyUser._id, type: 'like' });
  check('Self-like does NOT create notification', beforeSelf === afterSelf, { beforeSelf, afterSelf });

  // ── 12. notifyLike to other user ──────────────────────────────────────────
  const otherUser = await User.findOne({ _id: { $ne: anyUser._id } }).lean();
  if (otherUser) {
    const fakePostId = new mongoose.Types.ObjectId();
    const beforeOther = await Notification.countDocuments({ recipient: otherUser._id, type: 'like' });
    await notifService.notifyLike(fakePostId, anyUser._id, otherUser._id, anyUser.username);
    const afterOther = await Notification.countDocuments({ recipient: otherUser._id, type: 'like' });
    check('notifyLike to other user creates notification', afterOther === beforeOther + 1, { beforeOther, afterOther });
  }

  // ── 13. Moderation hook exports ───────────────────────────────────────────
  check('notifyModerationRemoved exported', typeof notifService.notifyModerationRemoved === 'function', null);
  check('notifyAppealReviewed exported', typeof notifService.notifyAppealReviewed === 'function', null);
  check('notifyPostRestored exported', typeof notifService.notifyPostRestored === 'function', null);

  // ── 14. Moderation hooks smoke test ──────────────────────────────────────
  const fakePostId2 = new mongoose.Types.ObjectId();
  await notifService.notifyModerationRemoved(fakePostId2, userId, 'Spam content');
  await notifService.notifyAppealReviewed(fakePostId2, userId, 'rejected');
  await notifService.notifyPostRestored(fakePostId2, userId);
  r = await req(server, 'GET', '/api/notifications?limit=50', null, token);
  const modNotifs = (r.body.notifications || []).filter((n) =>
    ['moderation_removed', 'appeal_reviewed', 'post_restored'].includes(n.type)
  );
  check('Moderation hook notifications appear in list', modNotifs.length >= 3, modNotifs.slice(0, 3));

  // ── 15. Existing features unaffected ─────────────────────────────────────
  r = await req(server, 'GET', '/api/health');
  check('Health still works', r.status === 200 && r.body.status === 'ok', r.body);

  r = await req(server, 'GET', '/api/posts?sort=newest&limit=3');
  check('Feed still works', r.status === 200 && Array.isArray(r.body.posts), r.body);

  r = await req(server, 'GET', '/api/search/users?q=a&limit=3');
  check('Search still works', r.status === 200 && Array.isArray(r.body.users), r.body);

  console.log('');
  console.log('Results:', pass + '/' + (pass + fail), 'passed,', fail, 'failed');

  server.close();
  await mongoose.disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e.stack); process.exit(1); });
