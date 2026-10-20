/**
 * Auth business logic (kept separate from HTTP concerns in the controller).
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');

async function registerUser({ username, email, password, bio }) {
  // Explicit checks give clear, field-specific messages.
  // The unique index + error handler (code 11000) still covers race conditions.
  const existing = await User.findOne({ $or: [{ email }, { username }] }).select('email username').lean();
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new ApiError(409, `This ${field} is already registered`, [
      { field, message: `This ${field} is already registered` },
    ]);
  }

  const user = await User.create({ username, email, password, bio });
  return { user, token: signToken(user) };
}

async function loginUser({ identifier, password }) {
  const query = identifier.includes('@') ? { email: identifier } : { username: identifier };
  const user = await User.findOne(query).select('+password +tokenVersion');

  // Same message for unknown user and wrong password to avoid account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email/username or password');
  }
  if (user.isSuspended) throw ApiError.forbidden('Your account has been suspended');

  user.lastLoginAt = new Date();
  user.refreshMonthlyRestores();
  await user.save();

  return { user, token: signToken(user) };
}

/** Invalidates every token issued to this user so far. */
async function logoutUser(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

module.exports = { registerUser, loginUser, logoutUser };
