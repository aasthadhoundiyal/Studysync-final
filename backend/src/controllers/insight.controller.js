/**
 * Insight controller — thin HTTP layer over insight.service.
 * Handles both summary and keyword endpoints.
 */
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const insightService = require('../services/insight.service');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * GET /api/posts/:id/summary
 * Returns a cached summary if fresh, otherwise generates one via Gemini.
 * Query: ?force=true  — skip cache and always regenerate.
 */
const getOrGenerateSummary = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const { summary, generatedAt, cached } = await insightService.getOrGenerateSummary(
    req.params.id,
    req.user,
    force
  );

  res.json({ success: true, cached, summary, generatedAt });
});

/**
 * DELETE /api/posts/:id/summary
 * Clears the cached summary (author or admin only).
 */
const deleteSummary = asyncHandler(async (req, res) => {
  await insightService.deleteSummary(req.params.id, req.user);
  res.json({ success: true, message: 'Summary cache cleared' });
});

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

/**
 * GET /api/posts/:id/keywords
 * Returns cached keywords if fresh, otherwise extracts them via Gemini.
 * Query: ?force=true  — skip cache and always regenerate.
 */
const getOrGenerateKeywords = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const { keywords, generatedAt, cached } = await insightService.getOrGenerateKeywords(
    req.params.id,
    req.user,
    force
  );

  res.json({ success: true, cached, keywords, generatedAt });
});

/**
 * DELETE /api/posts/:id/keywords
 * Clears cached keywords (author or admin only).
 */
const deleteKeywords = asyncHandler(async (req, res) => {
  await insightService.deleteKeywords(req.params.id, req.user);
  res.json({ success: true, message: 'Keywords cache cleared' });
});

module.exports = { getOrGenerateSummary, deleteSummary, getOrGenerateKeywords, deleteKeywords };
