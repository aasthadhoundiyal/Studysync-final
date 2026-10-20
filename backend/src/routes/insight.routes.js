/**
 * Insight routes — summary and keywords for a post.
 *
 * Summary:  GET/DELETE /api/posts/:id/summary
 * Keywords: GET/DELETE /api/posts/:id/keywords
 *
 * Both sub-routers use mergeParams so the :id from the parent is visible.
 * All routes require authentication (protect).
 */
'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/insight.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getInsightRules, insightPostIdRules } = require('../validators/insight.validators');

// Summary router — mounted at /api/posts/:id/summary
const summaryRouter = Router({ mergeParams: true });
summaryRouter.get('/', protect, validate(getInsightRules), ctrl.getOrGenerateSummary);
summaryRouter.delete('/', protect, validate(insightPostIdRules), ctrl.deleteSummary);

// Keywords router — mounted at /api/posts/:id/keywords
const keywordsRouter = Router({ mergeParams: true });
keywordsRouter.get('/', protect, validate(getInsightRules), ctrl.getOrGenerateKeywords);
keywordsRouter.delete('/', protect, validate(insightPostIdRules), ctrl.deleteKeywords);

module.exports = { summaryRouter, keywordsRouter };
