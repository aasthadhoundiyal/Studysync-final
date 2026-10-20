/**
 * Creates (or updates) the demo student account.
 * Run with: node scripts/seedStudent.js
 */
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function seedStudent() {
  await mongoose.connect('mongodb://127.0.0.1:27017/studysync');

  const username = 'student';
  const email = 'student@studysync.local';
  const password = 'Student@12345';

  let student = await User.findOne({
    $or: [{ username: 'student' }, { email: 'student@studysync.local' }],
  });

  if (student) {
    student.username = username;
    student.email = email;
    student.password = password; // pre-save will re-hash
    student.role = 'user';
    student.points = 120;
    student.currentStreak = 5;
    student.longestStreak = 14;
    student.bio = 'Undergraduate student exploring Computer Science & Mathematics. Passionate about study streaks!';
    await student.save();
    console.log(`[seed] Updated existing demo student: ${student.username} (${student.email})`);
  } else {
    student = await User.create({
      username,
      email,
      password,
      role: 'user',
      points: 120,
      currentStreak: 5,
      longestStreak: 14,
      bio: 'Undergraduate student exploring Computer Science & Mathematics. Passionate about study streaks!',
    });
    console.log(`[seed] Created demo student: ${student.username} (${student.email})`);
  }
}

seedStudent()
  .catch((err) => {
    console.error(`[seed] Failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
