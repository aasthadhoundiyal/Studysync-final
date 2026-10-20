/**
 * Test endpoints for verifying JWT authentication and role-based authorization.
 */
const { Router } = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = Router();

/** GET /api/test/protected — any authenticated user */
router.get('/protected', protect, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.username}, your token is valid`,
    user: { _id: req.user._id, username: req.user.username, role: req.user.role },
  });
});

/** GET /api/test/admin — admins only */
router.get('/admin', protect, authorize('admin'), (req, res) => {
  res.json({ success: true, message: `Welcome admin ${req.user.username}` });
});

module.exports = router;
