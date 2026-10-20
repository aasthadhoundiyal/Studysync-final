/**
 * Creates (or promotes) the admin account defined in .env.
 * Run with: npm run seed:admin
 */
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function seedAdmin() {
  const { username, email, password } = env.admin;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  await connectDB();

  let admin = await User.findOne({ email: email.toLowerCase() });
  if (admin) {
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
      console.log(`[seed] Promoted existing user ${admin.email} to admin`);
    } else {
      console.log(`[seed] Admin ${admin.email} already exists`);
    }
  } else {
    admin = await User.create({ username, email, password, role: 'admin' });
    console.log(`[seed] Created admin ${admin.email} (username: ${admin.username})`);
  }
}

seedAdmin()
  .catch((err) => {
    console.error(`[seed] Failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
