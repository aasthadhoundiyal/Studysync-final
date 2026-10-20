/**
 * Recomputes every post's likesCount from the likes collection.
 * Counters are kept accurate by atomic updates; this is a safety net for manual DB edits.
 * Run with: npm run recount:likes
 */
const mongoose = require('mongoose');
require('../src/config/env');
const { connectDB } = require('../src/config/db');
const { recountAllLikes } = require('../src/services/like.service');

connectDB()
  .then(recountAllLikes)
  .then((fixed) => console.log(`[recount] Corrected likesCount on ${fixed} post(s)`))
  .catch((err) => {
    console.error(`[recount] Failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
