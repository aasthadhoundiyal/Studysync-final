/**
 * Profile business logic.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { deleteLocalUpload } = require('../utils/files');
const { levelInfo } = require('./points.service');
const { getStreakInfo } = require('./streak.service');

/**
 * Counts a user's published posts and their comments directly from the database.
 * Comments are counted from the raw collection until the Comment model is added.
 */
async function countUserContent(userId) {
  const [postsCount, commentsCount] = await Promise.all([
    Post.countDocuments({ author: userId, status: 'published' }),
    mongoose.connection.collection('comments').countDocuments({ author: userId }),
  ]);
  return { postsCount, commentsCount };
}

/**
 * Builds the profile response.
 * Public fields are visible to anyone; private fields only to the owner.
 */
async function buildProfile(user, { includePrivate = false, viewer = null } = {}) {
  const counts = await countUserContent(user._id);
  const li = levelInfo(user.points);
  const streak = getStreakInfo(user); // computes effective streak + postedToday

  const profile = {
    _id: user._id,
    username: user.username,
    profilePicture: user.profilePicture,
    bio: user.bio,
    postsCount: counts.postsCount,
    commentsCount: counts.commentsCount,
    points: user.points,
    level: li.level,
    levelName: li.levelName,
    nextLevel: li.nextLevel,
    nextLevelName: li.nextLevelName,
    pointsToNextLevel: li.pointsToNextLevel,
    // Streak fields — effective values (dead-streak detection applied)
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    postedToday: streak.postedToday,
    isStreakAlive: streak.isStreakAlive,
    streakRestoresRemaining: user.streakRestoresRemaining ?? 0,
    role: user.role,
    createdAt: user.createdAt,
    isOwnProfile: Boolean(viewer && viewer._id.equals(user._id)),
  };

  if (includePrivate) {
    Object.assign(profile, {
      email: user.email,
      lastPostDate: user.lastPostDate,
      updatedAt: user.updatedAt,
    });
  }

  return profile;
}

/** Finds a user by ObjectId or username. */
async function findUserByIdentifier(identifier) {
  if (mongoose.isValidObjectId(identifier) && /^[a-f0-9]{24}$/i.test(identifier)) {
    const byId = await User.findById(identifier);
    if (byId) return byId;
  }
  return User.findOne({ username: identifier.toLowerCase() });
}

async function getOwnProfile(user) {
  if (user.refreshMonthlyRestores()) await user.save();
  return buildProfile(user, { includePrivate: true, viewer: user });
}

/**
 * Finds a user by ID/username that the viewer is allowed to see.
 * Suspended users are hidden (404) except from admins and themselves.
 */
async function findVisibleUser(identifier, viewer) {
  const user = await findUserByIdentifier(identifier);
  const viewerCanSeeSuspended = viewer && (viewer.role === 'admin' || (user && viewer._id.equals(user._id)));
  if (!user || (user.isSuspended && !viewerCanSeeSuspended)) {
    throw ApiError.notFound('User not found');
  }
  return user;
}

async function getPublicProfile(identifier, viewer) {
  const user = await findVisibleUser(identifier, viewer);
  const isOwner = Boolean(viewer && viewer._id.equals(user._id));
  return buildProfile(user, { includePrivate: isOwner, viewer });
}

async function assertUsernameAvailable(username, currentUserId) {
  const taken = await User.exists({ username, _id: { $ne: currentUserId } });
  if (taken) {
    throw new ApiError(409, 'This username is already taken', [
      { field: 'username', message: 'This username is already taken' },
    ]);
  }
}

/**
 * Updates whitelisted profile fields on the authenticated user.
 * @param {object} updates - any of { username, bio, profilePicture }
 */
async function updateProfile(user, updates) {
  const { username, bio, profilePicture } = updates;
  let oldPictureToDelete = null;

  if (username !== undefined && username !== user.username) {
    await assertUsernameAvailable(username, user._id);
    user.username = username;
  }
  if (bio !== undefined) user.bio = bio;
  if (profilePicture !== undefined && profilePicture !== user.profilePicture) {
    oldPictureToDelete = user.profilePicture;
    user.profilePicture = profilePicture;
  }

  await user.save(); // unique index still guards against username race conditions
  if (oldPictureToDelete) await deleteLocalUpload(oldPictureToDelete);

  return buildProfile(user, { includePrivate: true, viewer: user });
}

/** Replaces the profile picture with an uploaded file (public path) and removes the previous local file. */
async function setProfilePicture(user, publicPath) {
  const previous = user.profilePicture;
  user.profilePicture = publicPath;
  try {
    await user.save();
  } catch (err) {
    await deleteLocalUpload(publicPath); // don't leave orphaned files
    throw err;
  }
  if (previous && previous !== publicPath) await deleteLocalUpload(previous);
  return buildProfile(user, { includePrivate: true, viewer: user });
}

async function removeProfilePicture(user) {
  return updateProfile(user, { profilePicture: '' });
}

module.exports = {
  countUserContent,
  findVisibleUser,
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  setProfilePicture,
  removeProfilePicture,
};
