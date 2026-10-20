const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/studysync');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await User.updateOne(
    { username: 'admin' },
    {
      $set: {
        points: 85,
        currentStreak: 4,
        longestStreak: 12,
        lastPostDate: yesterday,
        bio: 'Computer Science senior & StudySync administrator. Researching distributed systems and compiler design.',
      },
    }
  );
  console.log('Admin updated with demo values.');
  process.exit(0);
}

run();
