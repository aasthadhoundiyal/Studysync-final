const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const { toPublicPath } = require('../middleware/upload');

/** GET /api/users/me */
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getOwnProfile(req.user);
  res.json({ success: true, profile });
});

/** GET /api/users/:identifier  (ObjectId or username) */
const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getPublicProfile(req.params.identifier, req.user);
  res.json({ success: true, profile });
});

/** PATCH /api/users/me  { username?, bio?, profilePicture? (URL or '') } */
const updateMyProfile = asyncHandler(async (req, res) => {
  const { username, bio, profilePicture } = req.body;
  const profile = await userService.updateProfile(req.user, { username, bio, profilePicture });
  res.json({ success: true, message: 'Profile updated', profile });
});

/** PATCH /api/users/me/username  { username } */
const updateMyUsername = asyncHandler(async (req, res) => {
  const profile = await userService.updateProfile(req.user, { username: req.body.username });
  res.json({ success: true, message: 'Username updated', profile });
});

/** PATCH /api/users/me/bio  { bio } */
const updateMyBio = asyncHandler(async (req, res) => {
  const profile = await userService.updateProfile(req.user, { bio: req.body.bio });
  res.json({ success: true, message: 'Bio updated', profile });
});

/** PUT /api/users/me/profile-picture  multipart/form-data, field "profilePicture" */
const uploadMyProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided. Send a file in the "profilePicture" field.');
  const profile = await userService.setProfilePicture(req.user, toPublicPath('avatars', req.file.filename));
  res.json({ success: true, message: 'Profile picture updated', profile });
});

/** DELETE /api/users/me/profile-picture */
const deleteMyProfilePicture = asyncHandler(async (req, res) => {
  const profile = await userService.removeProfilePicture(req.user);
  res.json({ success: true, message: 'Profile picture removed', profile });
});

module.exports = {
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  updateMyUsername,
  updateMyBio,
  uploadMyProfilePicture,
  deleteMyProfilePicture,
};
