const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const streakCtrl = require('../controllers/streak.controller');
const postCtrl = require('../controllers/post.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUploader, IMAGE_EXTENSIONS } = require('../middleware/upload');
const {
  updateProfileRules,
  updateUsernameRules,
  updateBioRules,
  identifierParamRules,
} = require('../validators/user.validators');
const { feedQueryRules } = require('../validators/post.validators');

const router = Router();

const avatarUpload = createUploader({ subdir: 'avatars', allowedExtensions: IMAGE_EXTENSIONS, maxFileSizeMB: 2 });

// --- Own profile (authenticated user only). Must be declared before "/:identifier". ---
router.get('/me', protect, ctrl.getMyProfile);
router.patch('/me', protect, validate(updateProfileRules), ctrl.updateMyProfile);
router.patch('/me/username', protect, validate(updateUsernameRules), ctrl.updateMyUsername);
router.patch('/me/bio', protect, validate(updateBioRules), ctrl.updateMyBio);
router.put('/me/profile-picture', protect, avatarUpload.single('profilePicture'), ctrl.uploadMyProfilePicture);
router.delete('/me/profile-picture', protect, ctrl.deleteMyProfilePicture);

// Streak info for the authenticated user.
router.get('/me/streak', protect, streakCtrl.getMyStreak);
// Consume a monthly restore token to revive a broken streak.
router.post('/me/streak/restore', protect, streakCtrl.restoreMyStreak);

// --- Public profiles (token optional; used to flag isOwnProfile) ---
router.get('/:identifier', optionalAuth, validate(identifierParamRules), ctrl.getUserProfile);
router.get(
  '/:identifier/posts',
  optionalAuth,
  validate([...identifierParamRules, ...feedQueryRules]),
  postCtrl.getUserPosts
);

module.exports = router;
