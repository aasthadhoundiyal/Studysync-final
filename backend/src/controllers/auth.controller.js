const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/** POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, bio } = req.body;
  const { user, token } = await authService.registerUser({ username, email, password, bio });
  res.status(201).json({ success: true, message: 'Registration successful', token, user });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const { user, token } = await authService.loginUser({ identifier, password });
  res.json({ success: true, message: 'Login successful', token, user });
});

/** POST /api/auth/logout (protected) */
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  res.json({ success: true, message: 'Logged out successfully' });
});

/** GET /api/auth/me (protected) */
const getMe = asyncHandler(async (req, res) => {
  if (req.user.refreshMonthlyRestores()) await req.user.save();
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, logout, getMe };
