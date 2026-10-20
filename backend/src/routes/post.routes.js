const { Router } = require('express');
const ctrl = require('../controllers/post.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUploader, POST_ATTACHMENT_EXTENSIONS } = require('../middleware/upload');
const { POST_LIMITS } = require('../models/Post');
const { createPostRules, feedQueryRules, postIdRules } = require('../validators/post.validators');
const { onlyAllowedFields } = require('../validators/common');
const likeCtrl = require('../controllers/like.controller');
const shareCtrl = require('../controllers/share.controller');

const router = Router();

/**
 * Post attachments: images, MP4 video, PDF/Office/TXT documents.
 * Per-file limits come from CATEGORY_LIMITS_MB (image 5 MB, video 50 MB, document 20 MB).
 */
const attachmentUpload = createUploader({
  subdir: 'posts',
  allowedExtensions: POST_ATTACHMENT_EXTENSIONS,
  maxFiles: POST_LIMITS.maxAttachments,
  maxTotalSizeMB: 100,
});

// Reads: token optional (adds isLiked / isOwner / canDelete for the viewer)
router.get('/', optionalAuth, validate(feedQueryRules), ctrl.getFeed);
router.get('/:id', optionalAuth, validate(postIdRules), ctrl.getPost);

// Writes: authentication required.
// Accepts application/json (text-only) or multipart/form-data (with "attachments" files).
// `protect` runs before the upload so unauthenticated requests never write files to disk.
router.post('/', protect, attachmentUpload.array('attachments'), validate(createPostRules), ctrl.createPost);
router.delete('/:id', protect, validate(postIdRules), ctrl.deletePost);

// Likes. The request body is ignored by design; any fields sent (e.g. likesCount) are rejected.
const likeRules = [...postIdRules, onlyAllowedFields([], { requireOne: false, verb: 'set' })];
router.get('/:id/like', optionalAuth, validate(postIdRules), likeCtrl.getLikeStatus);
router.post('/:id/like', protect, validate(likeRules), likeCtrl.likePost);
router.delete('/:id/like', protect, validate(likeRules), likeCtrl.unlikePost);

// Shares. GET is optional-auth (anyone can read share count + URL); POST requires auth.
// Body is intentionally ignored — no client-supplied fields are accepted.
const shareRules = [...postIdRules, onlyAllowedFields([], { requireOne: false, verb: 'set' })];
router.get('/:id/share', optionalAuth, validate(postIdRules), shareCtrl.getShareStatus);
router.post('/:id/share', protect, validate(shareRules), shareCtrl.sharePost);

module.exports = router;

