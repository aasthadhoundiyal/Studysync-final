/**
 * Appeal routes — user-facing endpoints.
 *
 * POST /api/appeals              — submit an appeal  [protect]
 * GET  /api/appeals/me           — list own appeals  [protect]
 */
'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/appeal.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitAppealRules } = require('../validators/appeal.validators');
const { paginationQueryRules: pgRules } = require('../validators/common');

const router = Router();

// GET must be declared before POST so /me is not caught as a body-parsed route.
router.get('/me', protect, validate(pgRules), ctrl.getMyAppeals);
router.post('/', protect, validate(submitAppealRules), ctrl.submitAppeal);

module.exports = router;
